import { beep } from './beep.js';
import { getDomElements } from './dom.js';
import {
  extractPrediction,
  getItem,
  getItemFuzzy,
  isAnItem,
  renderItem,
} from './item.js';

const {
  itemEl,
  noFeedErrorEl,
  priceEl,
  rescanButtonEl,
  videoEl,
} = getDomElements();

// detection algorithms
const OPTICAL_CHARACTER_RECOGNITION = 'ocr';
const OBJECT_DETECTION = 'od';

// specify algorithm(s) ordered by preference
let detectionAlgorithms = [OPTICAL_CHARACTER_RECOGNITION, OBJECT_DETECTION];

let isScanning = true;
let objectDetectionModel = null;

const { createWorker, createScheduler } = Tesseract;
const scheduler = createScheduler();

const renderDetection = (item) => {
  isScanning = false;
  renderItem(item, itemEl, priceEl);
  rescanButtonEl.className = 'show';
  beep();
};

const runObjectDetection = async () => {
  const predictions = await objectDetectionModel.detect(videoEl);
  const prediction = extractPrediction(predictions);
  return getItem(prediction);
};

const runCharacterDetection = async () => {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  c.getContext('2d').drawImage(video, 0, 0, 640, 360);
  const { data: { text } } = await scheduler.addJob('recognize', c);
  return getItemFuzzy(text);
};

const loadCharacterDetection = async () => {
  for (let i = 0; i < 4; i++) {
    const worker = createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    scheduler.addWorker(worker);
  }
};

const DETECTION_ALGORITHM_MAP = {
  ocr: runCharacterDetection,
  od: runObjectDetection,
};

const DETECTION_MODEL_MAP = {
  ocr: loadCharacterDetection,
  od: cocoSsd.load,
};

const detectFrame = () => {
  if (!isScanning) return;

  let detectionPromises = [];
  for (const algorithmName of detectionAlgorithms) {
    detectionPromises.push(DETECTION_ALGORITHM_MAP[algorithmName]());
  }

  Promise.allSettled([...detectionPromises])
    .then((values) => {
      const items = values.filter(({ value: item }) => isAnItem(item) ? item : false);
      if (items.length) {
        renderDetection(items[0].value);
      } else {
        detectFrame();
      }
    })
    .catch((error) => {
      console.error(error);
    });
};

const scan = () => {
  rescanButtonEl.className = 'hide';
  requestAnimationFrame(() => {
    detectFrame();
  });
};

const rescan = () => {
  isScanning = true;
  scan();
};

const getMedia = async (constraints) => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const webCamPromise = navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        noFeedErrorEl.className = 'hide';
        videoEl.srcObject = stream;
        return new Promise((resolve) => {
          videoEl.onloadedmetadata = () => {
            resolve();
          };
        });
      });

    let modelPromises = [];
    for (const algorithmName of detectionAlgorithms) {
      modelPromises.push(DETECTION_MODEL_MAP[algorithmName]());
    }

    Promise.allSettled([...modelPromises, webCamPromise])
      .then((values) => {
        if (detectionAlgorithms.includes(OBJECT_DETECTION)) {
          objectDetectionModel = values[detectionAlgorithms.indexOf(OBJECT_DETECTION)]?.value;
        }
        detectFrame();
      })
      .catch((error) => {
        console.error(error);
      });
  };
};

navigator.permissions.query({ name: 'camera' })
  .then(() => {
    getMedia({
      video: { facingMode: 'environment' },
    });
  })
  .catch((error) => {
    console.error(error);
  });

// register events
rescanButtonEl.addEventListener ('click', rescan);

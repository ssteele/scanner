import { beep } from './beep.js';
import { getDomElements } from './dom.js';
import {
  extractPrediction,
  getItem,
  getItemFuzzy,
  isAnItem,
  isDetected,
  renderItem,
} from './item.js';

const {
  itemEl,
  noFeedErrorEl,
  priceEl,
  reportButtonEl,
  rescanButtonEl,
  videoEl,
} = getDomElements();

// detection algorithms
const OPTICAL_CHARACTER_RECOGNITION = 'ocr';
const OBJECT_DETECTION = 'od';

// config
let detectionAlgorithm = OPTICAL_CHARACTER_RECOGNITION;
// let detectionAlgorithm = OBJECT_DETECTION; // @todo: remove me
const urlParams = new URLSearchParams(window.location.search);
const maxScanAttempts = urlParams.get('max') ?? 100;
const doCollectUnknown = urlParams.get('collect') ?? false;
const isContinuousScan = urlParams.get('continuous') ?? doCollectUnknown;

let isScanning = true;
let scanIteration = 0;
let model = null;
let unknownItems = new Set([]);

const renderDetection = (item) => {
  renderItem(item, itemEl, priceEl);
  rescanButtonEl.className = 'show';
  beep();
};

const renderObjectDetection = (item) => {
  scanIteration = 0;
  renderDetection(item);
};

const runObjectDetection = () => {
  model.detect(videoEl)
    .then(predictions => {
      const prediction = extractPrediction(predictions);
      const isPrediction = isDetected(prediction);

      const item = getItem(prediction);
      const isItem = isAnItem(item);

      if (!isContinuousScan) {
        if (isPrediction) {
          renderObjectDetection(item);
        } else {
          scanIteration++;
          if (scanIteration < maxScanAttempts) {
            rescan();
          } else {
            renderObjectDetection(null);
          }
        }
      } else {
        if (doCollectUnknown && isPrediction && !isItem) {
          unknownItems.add(item?.prediction);
          reportButtonEl.className = 'show';
        }
        renderItem(item, itemEl, priceEl);
        rescan();
      }
    });
};

const runCharacterDetection = () => {
  const { createWorker, createScheduler } = Tesseract;
  const scheduler = createScheduler();
  let timerId = null;

  const doOCR = async () => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 360;
    c.getContext('2d').drawImage(video, 0, 0, 640, 360);
    const { data: { text } } = await scheduler.addJob('recognize', c);
    text.split('\n').forEach((line) => {
      const item = getItemFuzzy(line);
      const isItem = isAnItem(item);
      if (isItem) {
        renderDetection(item);
      }
    });
  };

  (async () => {
    for (let i = 0; i < 4; i++) {
      const worker = createWorker();
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      scheduler.addWorker(worker);
    }
    // video.addEventListener('play', () => {
      timerId = setInterval(doOCR, 1000);
    // });
    // video.addEventListener('pause', () => {
    //   clearInterval(timerId);
    // });
    // video.controls = true;
  })();
};

const detectFrame = () => {
  if (!isScanning) return;

  if (detectionAlgorithm === OPTICAL_CHARACTER_RECOGNITION) {
    runCharacterDetection();
  } else if (detectionAlgorithm === OBJECT_DETECTION) {
    runObjectDetection();
  }
};

const rescan = () => {
  isScanning = true;
  rescanButtonEl.className = 'hide';
  requestAnimationFrame(() => {
    detectFrame();
  });
};

const report = () => {
  isScanning = false;
  reportButtonEl.className = 'hide';
  const itemsReport = Array.from(unknownItems);
  itemEl.innerHTML = itemsReport.join(', ');
  itemEl.className = 'small';
  rescanButtonEl.className = 'show';
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

    const modelPromise = cocoSsd.load();

    Promise.all([modelPromise, webCamPromise])
      .then((values) => {
        model = values[0];
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
reportButtonEl.addEventListener ('click', report);

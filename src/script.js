import { beep } from './beep.js';
import { ITEMS } from './constants/items.js';

// register dom elements
const videoEl = document.getElementById('video');
const itemEl = document.getElementById('item');
const priceEl = document.getElementById('price');
const rescanButtonEl = document.getElementById('rescan-button');
const reportButtonEl = document.getElementById('report-button');
const noFeedErrorEl = document.getElementById('no-feed-error');

// config
const urlParams = new URLSearchParams(window.location.search);
const maxScanAttempts = urlParams.get('max') ?? 100;
const doCollectUnknown = urlParams.get('collect') ?? false;
const unknownItems = new Set([]);

const OPTICAL_CHARACTER_RECOGNITION = 'ocr';
const OBJECT_DETECTION = 'od';
let detectionAlgorithm = OPTICAL_CHARACTER_RECOGNITION;
let isContinuousScan = urlParams.get('continuous') ?? doCollectUnknown;
let isDetecting = true;
let scanIteration = 0;
let model = null;

const showCase = (string) => {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

const camelCase = (string) => {
  return string.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

let currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const extractPrediction = (predictions) => {
  return predictions?.reduce((a, v) => {
    return (v?.score > a?.score) ? v : a;
  }, { score: 0 })?.class;
}

const isDetected = (prediction) => {
  return !!prediction;
}

const isAnItem = (item) => {
  return !!item?.id;
}

const getItem = (prediction) => {
  if (!isDetected(prediction)) return null;

  const predictionId = camelCase(prediction);
  let item = ITEMS.find((item) => predictionId === item?.id);
  if (!isAnItem(item)) {
    item = {
      id: '',
      name: showCase(prediction),
      prediction,
      price: null,
    }
  }

  return item;
}

const renderItem = (item) => {
  if (!!item) {
    itemEl.innerHTML = item?.name

    let price = null;
    if (item?.price) {
      price = currency.format(item?.price)
    }

    if (isAnItem(item)) {
      itemEl.className = '';
      priceEl.innerHTML = price;
    } else {
      itemEl.className = 'item-not-found';
      priceEl.innerHTML = '';
    }
  } else {
    itemEl.innerHTML = '?';
    itemEl.className = 'item-not-found';
    priceEl.innerHTML = '';
  }
};

const dispatchDetection = (item) => {
  renderItem(item);
  scanIteration = 0;
  rescanButtonEl.className = 'show';
  beep();
}

const detectFrame = (videoEl, model) => {
  if (!isDetecting) return;

  if (detectionAlgorithm === OPTICAL_CHARACTER_RECOGNITION) {
    const { createWorker, createScheduler } = Tesseract;
    const scheduler = createScheduler();
    // const video = document.getElementById('poem-video');
    // const messages = document.getElementById('messages');
    let timerId = null;

    const addMessage = (message) => {
      console.log('SHS message:', message); // @debug
    }

    const doOCR = async () => {
      const c = document.createElement('canvas');
      c.width = 640;
      c.height = 360;
      c.getContext('2d').drawImage(video, 0, 0, 640, 360);
      // const start = new Date();
      const { data: { text } } = await scheduler.addJob('recognize', c);
      // const end = new Date()
      // addMessage(`[${start.getMinutes()}:${start.getSeconds()} - ${end.getMinutes()}:${end.getSeconds()}], ${(end - start) / 1000} s`);
      text.split('\n').forEach((line) => {
        addMessage(line);
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
  } else if (detectionAlgorithm === OBJECT_DETECTION) {
    model.detect(videoEl)
      .then(predictions => {
        const prediction = extractPrediction(predictions);
        const isPrediction = isDetected(prediction);

        const item = getItem(prediction);
        const isItem = isAnItem(item);

        if (!isContinuousScan) {
          if (isPrediction) {
            dispatchDetection(item);
          } else {
            scanIteration++;
            if (scanIteration < maxScanAttempts) {
              rescan();
            } else {
              dispatchDetection(null);
            }
          }
        } else {
          if (doCollectUnknown && isPrediction && !isItem) {
            unknownItems.add(item?.prediction);
            reportButtonEl.className = 'show';
          }
          renderItem(item);
          rescan();
        }
      });
  }
};

const rescan = () => {
  isDetecting = true;
  rescanButtonEl.className = 'hide';
  requestAnimationFrame(() => {
    detectFrame(videoEl, model);
  });
}

const report = () => {
  isDetecting = false;
  reportButtonEl.className = 'hide';
  const itemsReport = Array.from(unknownItems);
  itemEl.innerHTML = itemsReport.join(', ');
  itemEl.className = 'small';
  rescanButtonEl.className = 'show';
}

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
        detectFrame(videoEl, model);
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

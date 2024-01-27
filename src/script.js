import { ITEMS } from './constants/items.js';
import { beep } from './beep.js';

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

let isContinuousScan = urlParams.get('continuous') ?? doCollectUnknown;
let isReport = false;
let scanIteration = 0;
let model = null;

const showCase = (string) => {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

const camelCase = (string) => {
  return string.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

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
  if (!isDetected(prediction)) {
    return null;
  }

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
    if (isAnItem(item)) {
      itemEl.className = '';
      priceEl.innerHTML = `$${item?.price}`;
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

const handleItem = (item) => {
  if (isReport) {
    return;
  }

  scanIteration = 0;
  renderItem(item);
  rescanButtonEl.className = 'show';
  beep();
}

const detectFrame = (videoEl, model) => {
  model.detect(videoEl)
    .then(predictions => {
      const prediction = extractPrediction(predictions);
      const isPrediction = isDetected(prediction);

      const item = getItem(prediction);
      const isItem = isAnItem(item);

      if (!isContinuousScan) {
        if (isPrediction) {
          handleItem(item);
        } else {
          scanIteration++;
          if (scanIteration < maxScanAttempts) {
            rescan();
          } else {
            handleItem(null);
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
};

const rescan = () => {
  rescanButtonEl.className = 'hide';
  requestAnimationFrame(() => {
    detectFrame(videoEl, model);
  });
}

const report = () => {
  isContinuousScan = false;
  isReport = true;
  reportButtonEl.className = 'hide';
  const itemsReport = Array.from(unknownItems);
  itemEl.innerHTML = itemsReport.join(', ');
  itemEl.className = 'small';
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

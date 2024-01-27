import { ITEMS } from './constants/items.js';
import { beep } from './beep.js';

// register dom elements
const videoEl = document.getElementById('video');
const itemEl = document.getElementById('item');
const priceEl = document.getElementById('price');
const rescanButtonEl = document.getElementById('rescan-button');
const noFeedErrorEl = document.getElementById('no-feed-error');

const isContinuousScan = true;
const maxScanAttempts = 100;
let scanIteration = 0;
let model = null;

const extractPrediction = (predictions) => {
  return predictions?.reduce((a, v) => {
    if (!a) return v;
    return (v?.score > a?.score) ? v : a;
  }, null)?.class;
}

const renderPrediction = (prediction) => {
  if (!!prediction) {
    const name = `${prediction.charAt(0).toUpperCase()}${prediction.slice(1)}`;
    const item = ITEMS.find((item) => prediction === item?.id);
    if (!!item) {
      itemEl.innerHTML = item?.name
      itemEl.className = '';
      priceEl.innerHTML = `$${item?.price}`;
    } else {
      itemEl.innerHTML = name;
      itemEl.className = 'item-not-found';
      priceEl.innerHTML = '';
    }
  } else {
    itemEl.innerHTML = '?';
    itemEl.className = 'item-not-found';
    priceEl.innerHTML = '';
  }
};

const handlePrediction = (prediction) => {
  scanIteration = 0;
  renderPrediction(prediction);
  rescanButtonEl.className = 'show';
  beep();
}

const detectFrame = (videoEl, model) => {
  model.detect(videoEl)
    .then(predictions => {
      const prediction = extractPrediction(predictions);
      if (isContinuousScan) {
        renderPrediction(prediction);
        rescan();
      } else {
        if (!!prediction) {
          handlePrediction(prediction);
        } else {
          scanIteration++;
          if (scanIteration < maxScanAttempts) {
            rescan();
          } else {
            handlePrediction(null);
          }
        }
      }
    });
};

const rescan = () => {
  rescanButtonEl.className = 'hide';
  requestAnimationFrame(() => {
    detectFrame(videoEl, model);
  });
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

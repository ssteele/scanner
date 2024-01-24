import { ITEMS } from './constants/items.js';
import { beep } from './beep.js';

// register dom elements
const videoEl = document.getElementById('video');
const objectEl = document.getElementById('object');
const rescanButtonEl = document.getElementById('rescan-button');
const noFeedErrorEl = document.getElementById('no-feed-error');

const isContinuousScan = false;
let model = null;

const renderPredictions = (predictions) => {
  const object = predictions?.reduce((a, v) => {
    if (!a) return v;
    return (v?.score > a?.score) ? v : a;
  }, null)?.class;
  console.log('object:', object);

  if (!!object) {
    let name = `${object.charAt(0).toUpperCase()}${object.slice(1)}`;
    let price = null;
    const item = ITEMS.find((item) => object === item?.id);
    if (!!item) {
      name = item?.name;
      price = item?.price;
      objectEl.innerHTML = `${name}: $${price}`;
    } else {
      objectEl.innerHTML = name;
      objectEl.className = 'item-not-found';
    }
  } else {
    objectEl.innerHTML = '?';
    objectEl.className = 'item-not-found';
  }
};

const detectFrame = (videoEl, model) => {
  model.detect(videoEl)
    .then(predictions => {
      renderPredictions(predictions);
      rescanButtonEl.className = 'show';
      if (isContinuousScan) {
        rescan();
      } else {
        beep();
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

// register element events
rescanButtonEl.addEventListener ('click', rescan);

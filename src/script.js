import { ITEMS } from './constants/items.js';

// register dom elements
const videoEl = document.getElementById('video');
const objectEl = document.getElementById('object');

const renderPredictions = (predictions) => {
  const object = predictions?.reduce((a, v) => {
    if (!a) return v;
    return (v?.score > a?.score) ? v : a;
  }, null)?.class;

  if (!!object) {
    const item = ITEMS.find((item) => object === item?.id);
    const name = item?.name || '?';
    const price = item?.price || '?';
    const denomination = (typeof price === 'number') ? '$' : '';
    objectEl.innerHTML = `${name}: ${denomination}${price}`;
  }
};

const detectFrame = (videoEl, model) => {
  model.detect(videoEl)
    .then(predictions => {
      renderPredictions(predictions);
      requestAnimationFrame(() => {
        detectFrame(videoEl, model);
      });
    });
};

const getMedia = async (constraints) => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const webCamPromise = navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
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
        detectFrame(videoEl, values[0]);
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

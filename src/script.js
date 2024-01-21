const video = document.getElementById('video');

const detectFrame = (video, model) => {
  model.detect(video)
    .then(predictions => {
      console.log('SHS predictions:', predictions); // @debug
      this.renderPredictions(predictions);
      // requestAnimationFrame(() => {
      //   detectFrame(video, model);
      // });
    });
};

const getMedia = async (constraints) => {
  // let stream = null;

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const webCamPromise = navigator.mediaDevices
        .getUserMedia(constraints)
        .then(stream => {
          video.srcObject = stream;
          return new Promise((resolve) => {
            video.onloadedmetadata = () => {
              resolve();
            };
          });
        });

      const modelPromise = cocoSsd.load();

      Promise.all([modelPromise, webCamPromise])
        .then((values) => {
          detectFrame(video, values[0]);
        })
        .catch((error) => {
          console.error(error);
        });
      }
  } catch (error) {
    console.error(error);
  }
}

navigator.permissions.query({ name: 'camera' })
  .then(() => {
    getMedia({
      video: { facingMode: 'environment' },
    });
  })
  .catch((error) => {
    console.log('SHS error:', error); // @debug
  });

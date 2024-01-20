const video = document.getElementById('video');

async function getMediaPermission(constraints) {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('SHS stream:', stream); // @debug
    video.srcObject = stream;
    video.play();
  } catch (err) {
    console.log('SHS err:', err); // @debug
  }
}

navigator.permissions.query({ name: 'camera' })
  .then(({ state }) => {
    console.log('SHS state:', state); // @debug
    // if (['denied', 'prompt'].includes(state)) {
      getMediaPermission({video: true});
    // }
  })
  .catch((error) => {
    console.log('SHS error:', error); // @debug
  })

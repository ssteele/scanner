// register dom elements
const itemEl = document.getElementById('item');
const noFeedErrorEl = document.getElementById('no-feed-error');
const priceEl = document.getElementById('price');
const reportButtonEl = document.getElementById('report-button');
const rescanButtonEl = document.getElementById('rescan-button');
const videoEl = document.getElementById('video');

export const getDomElements = () => {
  return {
    itemEl,
    noFeedErrorEl,
    priceEl,
    reportButtonEl,
    rescanButtonEl,
    videoEl,
  };
}

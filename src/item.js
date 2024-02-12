import { ITEMS } from './constants/items.js';
import {
    showCase,
    currency,
} from './string.js';

export const renderItem = (item, itemEl, priceEl) => {
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

export const extractPrediction = (predictions) => {
  return predictions?.reduce((a, v) => {
    return (v?.score > a?.score) ? v : a;
  }, { score: 0 })?.class;
};

export const isDetected = (prediction) => {
  return !!prediction;
};

export const isAnItem = (item) => {
  return !!item?.id;
};

export const notFound = (prediction) => {
  return {
    id: '',
    name: showCase(prediction),
    prediction,
    price: null,
  };
};

export const getItem = (prediction) => {
  if (!isDetected(prediction)) return null;

  let item = ITEMS.find((item) => prediction.toLowerCase() === item?.id);
  if (!isAnItem(item)) return notFound(prediction);

  return item;
};

export const getItemFuzzy = (prediction) => {
  if (!isDetected(prediction)) return null;

  let item = ITEMS.find((item) => {
    const itemRegex = new RegExp(item?.id);
    return itemRegex.test(prediction.toLowerCase());
  });
  if (!isAnItem(item)) return notFound(prediction);

  return item;
};

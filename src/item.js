import { ITEMS } from './constants/items.js';
import { showCase } from './string.js';

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

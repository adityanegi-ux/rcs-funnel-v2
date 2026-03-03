function debounce(func, wait = 0) {
  let timeoutId;

  function debounced(...args) {
    const context = this;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      func.apply(context, args);
    }, wait);
  }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}

export default debounce;

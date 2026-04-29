const pick = <T extends object, K extends keyof T>(object: T, keys: K[]): Pick<T, K> => {
  return keys.reduce(
    (obj, key) => {
      if (object != null && key in object) {
        obj[key] = object[key];
      }
      return obj;
    },
    {} as Pick<T, K>
  );
};

export { pick };

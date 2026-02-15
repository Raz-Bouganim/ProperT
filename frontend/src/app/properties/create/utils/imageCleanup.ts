export const revokeObjectURL = (url: string | undefined) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export const revokeMultipleURLs = (urls: (string | undefined)[]) => {
  urls.forEach(revokeObjectURL);
};

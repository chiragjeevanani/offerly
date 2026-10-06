// Variant-combination helpers shared by the product form's inventory editor.

export const comboKey = (attrs, options) => options.map((o) => `${o.name}=${attrs?.[o.name] ?? ''}`).join('|');
export const comboLabel = (attrs, options) => options.map((o) => attrs[o.name]).join(' / ');

const combinations = (options) =>
  options.reduce(
    (acc, opt) => acc.flatMap((partial) => opt.values.map((v) => ({ ...partial, [opt.name]: v }))),
    [{}]
  );

/** Rebuilds the variant rows for `options`, keeping qty/price already typed in for surviving combos. */
export const rebuildVariants = (options, previous) => {
  const usable = options.filter((o) => o.name.trim() && o.values.length);
  if (!usable.length) return [];
  const prevByKey = new Map((previous || []).map((v) => [comboKey(v.attributes, usable), v]));
  return combinations(usable).map((attributes) => {
    const prev = prevByKey.get(comboKey(attributes, usable));
    return { attributes, stock: prev?.stock ?? '', price: prev?.price ?? '', sku: prev?.sku ?? '' };
  });
};

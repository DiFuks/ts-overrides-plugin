// ok with strict: false
export const getDate = (date) => {
  const modern: string | undefined = undefined;

  // ok with strict: false
  modern.split('');

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// show `string` on hover in IDE
export const someVar: string | undefined = undefined;

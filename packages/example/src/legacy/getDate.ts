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

export const someVar: string | undefined = undefined;

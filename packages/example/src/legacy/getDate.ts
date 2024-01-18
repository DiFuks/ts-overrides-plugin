export const getDate = (date) => {
  const modern: string | undefined = 123;

  modern.split('');

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const getDate = (date) => {
  const modern: string | undefined = undefined;

  modern.split('');

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
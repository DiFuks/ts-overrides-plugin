export const getDate = (date) => {
  const modern: string | undefined = undefined;

  const legacy: number = 3;

  modern.split('');

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
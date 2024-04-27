import { someVar } from '../legacy/getDate';

export const getDate = (date) => {
  const modern: string | undefined = undefined;

  // Show `string | undefined` on hover in IDE
  console.log(someVar);

  modern.split('');

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

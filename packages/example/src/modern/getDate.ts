import { someVar } from '../legacy/getDate';

// Parameter 'date' implicitly has an 'any' type.
export const getDate = (date) => {
  const modern: string | undefined = undefined;

  // Show `string | undefined` on hover in IDE
  console.log(someVar);

  // 'modern' is possibly 'undefined'
  modern.split('');

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

import { someVar } from '../legacy/getDate';

// Parameter 'date' implicitly has an 'any' type.
export const getDate = (date) => {
  const modern: string | undefined = undefined;
  const alwaysStringVar = 'Some string';

  alwaysStringVar?.toLowerCase();

  // Show `string | undefined` on hover in IDE
  console.log(someVar);

  // 'modern' is possibly 'undefined'
  modern.split('');

  // 'GLOBAL_VAR' correct types
  GLOBAL_VAR.toLowerCase();

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

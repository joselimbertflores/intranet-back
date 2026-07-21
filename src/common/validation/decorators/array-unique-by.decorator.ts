import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

type UniqueValue = string | number | bigint | boolean | symbol | null | undefined;

export interface ArrayUniqueByOptions extends ValidationOptions {
  /**
   * Ignora null y undefined al comprobar duplicados.
   *
   * Es útil para IDs opcionales de elementos todavía no persistidos.
   *
   * @default true
   */
  ignoreNullish?: boolean;
}

export function ArrayUniqueBy<T>(
  selector: (item: T) => UniqueValue,
  options: ArrayUniqueByOptions = {},
): PropertyDecorator {
  const { ignoreNullish = true, ...validationOptions } = options;

  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'arrayUniqueBy',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [selector, ignoreNullish],
      options: validationOptions,
      validator: {
        validate(value: unknown, validationArguments: ValidationArguments): boolean {
          // Dejamos que @IsArray() se encargue de validar el tipo.
          if (!Array.isArray(value)) {
            return true;
          }

          const [getValue, shouldIgnoreNullish] = validationArguments.constraints as [
            (item: T) => UniqueValue,
            boolean,
          ];

          const encounteredValues = new Set<UniqueValue>();

          for (const item of value as T[]) {
            const selectedValue = getValue(item);

            if (shouldIgnoreNullish && (selectedValue === null || selectedValue === undefined)) {
              continue;
            }

            if (encounteredValues.has(selectedValue)) {
              return false;
            }

            encounteredValues.add(selectedValue);
          }

          return true;
        },

        defaultMessage(validationArguments: ValidationArguments): string {
          return `${validationArguments.property} must contain unique values`;
        },
      },
    });
  };
}

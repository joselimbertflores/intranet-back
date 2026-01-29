import { ValidationOptions, registerDecorator, ValidationArguments } from 'class-validator';

export function IsAfterDate(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
          if (!value) return true;
          if (!relatedValue) return true;

          const valueDate = value instanceof Date ? value : new Date(value as string | number);
          const relatedDate = relatedValue instanceof Date ? relatedValue : new Date(relatedValue as string | number);

          return valueDate.getTime() > relatedDate.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          return `${args.property} debe ser posterior a ${relatedPropertyName}`;
        },
      },
    });
  };
}

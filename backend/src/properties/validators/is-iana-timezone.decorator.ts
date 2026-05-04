import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { IANAZone } from 'luxon';

/** Validates `value` is a known IANA time zone name (e.g. America/New_York). */
export function IsIanaTimeZone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIanaTimeZone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          if (typeof value !== 'string') return false;
          const z = value.trim();
          if (!z) return false;
          return IANAZone.isValidZone(z);
        },
        defaultMessage() {
          return 'timeZone must be a valid IANA time zone identifier (e.g. America/New_York)';
        },
      },
    });
  };
}

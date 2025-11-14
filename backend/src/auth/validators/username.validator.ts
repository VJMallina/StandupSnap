import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidUsername',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Username must be 4-50 characters
          if (value.length < 4 || value.length > 50) {
            return false;
          }

          // Allowed: A-Z, a-z, 0-9, underscore (_)
          // No spaces allowed
          const usernameRegex = /^[A-Za-z0-9_]+$/;
          return usernameRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Username must be 4-50 characters and contain only letters (A-Z, a-z), numbers (0-9), and underscores (_). No spaces allowed.';
        },
      },
    });
  };
}

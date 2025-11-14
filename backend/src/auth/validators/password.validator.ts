import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Minimum 8 characters
          if (value.length < 8) {
            return false;
          }

          // Must include at least 1 uppercase letter (A-Z)
          if (!/[A-Z]/.test(value)) {
            return false;
          }

          // Must include at least 1 lowercase letter (a-z)
          if (!/[a-z]/.test(value)) {
            return false;
          }

          // Must include at least 1 numeral (0-9)
          if (!/[0-9]/.test(value)) {
            return false;
          }

          // Must include at least 1 special character (! @ # $ % ^ & * )
          if (!/[!@#$%^&*]/.test(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password must be at least 8 characters and include: 1 uppercase letter (A-Z), 1 lowercase letter (a-z), 1 number (0-9), and 1 special character (!@#$%^&*)';
        },
      },
    });
  };
}

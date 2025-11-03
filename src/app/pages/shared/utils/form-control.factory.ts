import { FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

// Custom validator for select fields (ensures selected value exists in options)
function inOptionsValidator(options: string[]) {
  return (control: AbstractControl): ValidationErrors | null => {
    return !options || options.length === 0 || options.includes(control.value)
      ? null
      : { invalidOption: true };
  };
}

export function buildFormControl(field: any, initialValue: any = ''): FormControl {
  const validators = [];

  // Base field validation
  if (field.notblank) validators.push(Validators.required);
  if (field.min !== undefined && field.min !== null) validators.push(Validators.min(field.min));
  if (field.max !== undefined && field.max !== null) validators.push(Validators.max(field.max));
  if (field.pattern) validators.push(Validators.pattern(field.pattern));

  // Custom validation for select
  if (field.type === 'select' && Array.isArray(field.options)) {
    validators.push(inOptionsValidator(field.options));
  }

  // Initialize value
  const startValue =
    field.type === 'select' && (initialValue === undefined || initialValue === '')
      ? null
      : initialValue ?? '';

  return new FormControl(startValue, {
    validators,
    updateOn: field.type === 'select' ? 'change' : 'blur'
  });
}

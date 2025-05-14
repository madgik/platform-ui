import { FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

function inOptionsValidator(options: string[]) {
  return (control: AbstractControl): ValidationErrors | null => {
    return options.includes(control.value) ? null : { invalidOption: true };
  };
}

export function buildFormControl(field: any, value: any = ''): FormControl {
  const validators = [];

  if (field.required) {
    validators.push(Validators.required);
  }

  if (field.type === 'number') {
    if (field.min !== undefined) {
      validators.push(Validators.min(field.min));
    }
    if (field.max !== undefined) {
      validators.push(Validators.max(field.max));
    }
  }

  if (field.type === 'select' && Array.isArray(field.options)) {
    validators.push(inOptionsValidator(field.options));
  }

  return new FormControl(value, validators);
}

import React from 'react';
import './FormInput.css';

interface FormInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  name?: string;
  maxLength?: number;
  readOnly?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({ label, type, value, onChange, placeholder, required = false, error, name, maxLength, readOnly }) => {
  return (
    <div className="form-input">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        name={name}
        maxLength={maxLength}
        readOnly={readOnly}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
};

export default FormInput;
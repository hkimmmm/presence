"use client"

interface InputProps {
    label: string;
    type: string;
    name: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }
  
  const InputField: React.FC<InputProps> = ({ label, type, name, placeholder, value, onChange }) => {
    return (
      <div>
        <label htmlFor={name} className="block text-gray-700 font-medium">{label}</label>
        <input 
          type={type} 
          id={name} 
          name={name} 
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400" 
          placeholder={placeholder} 
        />
      </div>
    );
  };
  
  export default InputField;
  
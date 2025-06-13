"use client"

interface SelectProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
  }
  
  const SelectField: React.FC<SelectProps> = ({ label, name, value, onChange, options }) => {
    return (
      <div>
        <label htmlFor={name} className="block text-gray-700 font-medium">{label}</label>
        <select 
          id={name} 
          name={name} 
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  };
  
  export default SelectField;
  
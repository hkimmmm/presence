"use client"

interface TextAreaProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
  }
  
  const TextAreaField: React.FC<TextAreaProps> = ({ label, name, value, onChange, placeholder }) => {
    return (
      <div className="md:col-span-2">
        <label htmlFor={name} className="block text-gray-700 font-medium">{label}</label>
        <textarea 
          id={name} 
          name={name} 
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400" 
          placeholder={placeholder}
        ></textarea>
      </div>
    );
  };
  
  export default TextAreaField;
  
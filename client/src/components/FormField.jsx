import React from 'react';

const FormField = ({ labelName, placeholder, inputType, isTextArea, value, handleChange }) => {
  return (
    <label className="flex flex-col flex-1 min-w-[260px] gap-2">
      {labelName && (
        <span className="text-sm font-semibold text-slate-700">{labelName}</span>
      )}
      {isTextArea ? (
        <textarea
          required
          value={value}
          onChange={handleChange}
          rows={6}
          placeholder={placeholder}
          className="w-full py-3 px-4 outline-none border border-slate-200 bg-white font-sans text-slate-800 text-sm leading-relaxed placeholder:text-slate-400 rounded-xl resize-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
        />
      ) : (
        <input
          required
          value={value}
          onChange={handleChange}
          type={inputType}
          step="0.01"
          placeholder={placeholder}
          className="w-full py-3 px-4 outline-none border border-slate-200 bg-white font-sans text-slate-800 text-sm placeholder:text-slate-400 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
        />
      )}
    </label>
  );
};

export default FormField;
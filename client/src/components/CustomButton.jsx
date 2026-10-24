import React from 'react';

const CustomButton = ({ btnType, title, handleClick, styles, disabled, icon }) => {
  return (
    <button
      type={btnType}
      className={`font-bold text-sm px-6 py-3 rounded-xl text-white shadow-sm hover:opacity-90 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none ${styles}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {icon && <span>{icon}</span>}
      {title}
    </button>
  );
};

export default CustomButton;
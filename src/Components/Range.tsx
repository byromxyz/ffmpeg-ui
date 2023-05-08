import React from 'react';
import styles from './Range.module.css'

interface Props {
    max: number;
    value: number;
    label: string;
    render: (value: number) => string;
    onChange: (value: number) => void;
}

const Slider: React.FC<Props> = ({ max, value, label, onChange, render }) => {
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);

    onChange(value);
  };

  return (
      <div>
        <label className={styles.label}>{label}</label>
        <span className={styles.value}>{render(value)}</span>
        <input type="range" min={0} max={max} value={value} onChange={handleValueChange} />
      </div>
  );
}

export default Slider;

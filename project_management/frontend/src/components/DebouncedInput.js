import React, {useState, useEffect} from 'react';

// A debounced input react component
const DebouncedInput = ({value: initialValue, onChange, debounce = 500, ...props }) => {
    const [value, setValue] = useState(initialValue);
  
    useEffect(() => {
      setValue(initialValue)
    }, [initialValue]);
  
    useEffect(() => {
      const timeout = setTimeout(() => {
        onChange(value)
      }, debounce);
  
      return () => clearTimeout(timeout)
    }, [value]);
  
    if(props.type == "date") {
      props = {...props, max: '9999-12-31'}
    }

    return (
      <input {...props} value={value} onChange={e => setValue(e.target.value)} className={props.type == "date" ? "globalSearch dateFilter" :"globalSearch"} />
    );
}

export default DebouncedInput;
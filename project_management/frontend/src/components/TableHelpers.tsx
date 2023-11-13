
import { FilterFn, } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { useState, useEffect, useMemo } from 'react'
import { Column, Table as ReactTable } from '@tanstack/react-table'
import DebouncedInput from './DebouncedInput'

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta({
    itemRank,
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}

export const inDateRange = (row: { getValue: (arg0: any) => string }, columnId: any, filterValue: [any, any]) => {
  let [min, max] = filterValue
  min = isNaN(Date.parse(min)) ? 0 : Date.parse(min)
  max = isNaN(Date.parse(max)) ? 9007199254740992 : Date.parse(max)
  
  const rowValue = row.getValue(columnId) ? Date.parse(row.getValue(columnId).split('/').reverse().join('-')) : 0
  return rowValue >= min && rowValue <= max
}

export const EditableCell = ({ getValue, row: { index }, column: { id }, table, type, setUpdateRequired, validation}: { 
  getValue: any, 
  row: { index: any }, 
  column: { id: any }, 
  table: any, 
  type?: 'number' | 'text',
  setUpdateRequired?: React.Dispatch<React.SetStateAction<boolean>>,
  validation?: (value: any) => void,
}) => {
  const initialValue = getValue()
  // We need to keep and update the state of the cell normally
  const [value, setValue] = useState(initialValue)

  // When the input is blurred, we'll call our table meta's updateData function
  const onBlur = () => {
    let val = value
    if(type == 'number') {
      val = parseFloat(value).toFixed(2)
    }

    if(initialValue !== value) {
      table.options.meta?.updateData(index, id, val)
      setUpdateRequired && setUpdateRequired(true);
      validation && validation(val);
    }
  }

  // If the initialValue is changed external, sync it up with our state
  useEffect(() => {
      setValue(initialValue)
  }, [initialValue])

  return (
      <input type={type} className="dataTableInput" step={type == 'number' ? 0.01 : 0}
        value={value} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
  )
}

export const CheckboxCell  = ({ getValue, row: {index}, column: { id }, table, setUpdateRequired}:
  { getValue: any, 
    row: { index: any }, 
    column: { id: any }, 
    table: any, 
    setUpdateRequired?: React.Dispatch<React.SetStateAction<boolean>> 
  }) => {
    const initialValue = getValue()
    // We need to keep and update the state of the cell normally
    const [value, setValue] = useState(initialValue)

    const onSelection = (e: { target: { value: any; }; }) => {
        setValue(!value)
        setUpdateRequired && setUpdateRequired(true);
        table.options.meta?.updateData(index, id, !value);
    }
    
    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    return (
        <input type="checkbox" checked={value as boolean} onChange={onSelection} /> 
    )
}

export const EditableDateCell = ({ getValue, row: { index }, column: { id }, table, setUpdateRequired }: 
  {
    getValue: any,
    row: { index: any },
    column: { id: any },
    table: any,
    setUpdateRequired?: React.Dispatch<React.SetStateAction<boolean>> 
  }) => {
  const initialValue = getValue()
  // We need to keep and update the state of the cell normally
  const [value, setValue] = useState(initialValue ?? null)

  // When the input is blurred, we'll call our table meta's updateData function
  const onBlur = () => {
      const val = (value === "" ? null : value)
      
      // Dont update if the value has not changed
      if(!(!initialValue && val === null) && !(initialValue === val)) {
        table.options.meta?.updateData(index, id, val)
          // setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((es, i) => {
          //     if(i === index) {
          //         const newEstimateSet = produce(prev.estimateSet[i], (draft: { [x: string]: { id: any; }; }) => {
          //             draft[id] = val
          //         })
          //         return newEstimateSet;
          //     }
          //     return es
          // })}))
        setUpdateRequired && setUpdateRequired(true);
      }
  }
  
  // If the initialValue is changed external, sync it up with our state
  useEffect(() => {
      setValue(initialValue ?? null)
  }, [initialValue])

  return (
      <input type="date" max="9999-12-31" className="estimateTableInput" value={value} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
  )
}

export const dateSort = (rowA: { getValue: (arg0: any) => string }, rowB: { getValue: (arg0: any) => string }, columnId: any) => {
        
  let valA = new Date(0)
  let valB = new Date(0)

  if(rowA.getValue(columnId) !== "") {
      var dateAParts = rowA.getValue(columnId).split("/");
      valA = new Date(+dateAParts[2], parseInt(dateAParts[1]) - 1, +dateAParts[0]); 
  }

  if(rowB.getValue(columnId) !== "") {
      var dateBParts = rowB.getValue(columnId).split("/");
      valB = new Date(+dateBParts[2], parseInt(dateBParts[1]) - 1, +dateBParts[0]);
  }

  return valA < valB ? 1 : -1;
}

export const TableFilter = ({column, table} : {column: Column<any>, table: ReactTable<any>}) => {
  const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id)

  const columnFilterValue = column.getFilterValue()
  
  const sortedUniqueValues = useMemo(
    () =>
      typeof firstValue === 'number'
        ? [] 
        : Array.from(column.getFacetedUniqueValues().keys()).sort(),
    [column.getFacetedUniqueValues()]
  )

  if(column?.columnDef?.sortingFn === dateSort) { //dateColumns.includes(column.id)
    return (
      <>
        <DebouncedInput
            type="date"
            value={(columnFilterValue as [any, any])?.[0] ?? ''}
            onChange={(value: any) => {
                column.setFilterValue((old: any) => [value, old?.[1]])
            }}
        />
        <DebouncedInput
            type="date"
            value={(columnFilterValue as [any, any])?.[1] ?? ''}
            onChange={(value: any) => {
                column.setFilterValue((old: any) => [old?.[0], value])
            }}
        />
      </>
    )
  } 

  if(typeof firstValue === 'number') {
      return (
          <>
              <DebouncedInput
                  type="number"
                  min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
                  max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
                  value={(columnFilterValue as [any, any])?.[0] ?? ''}
                  onChange={(value: any) =>
                      column.setFilterValue((old: any) => [value, old?.[1]])
                  }
                  placeholder={`Min ${
                      column.getFacetedMinMaxValues()?.[0]
                      ? `(${column.getFacetedMinMaxValues()?.[0]})`
                      : ''
                  }`}
              />

              <DebouncedInput
                  type="number"
                  min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
                  max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
                  value={(columnFilterValue as [any, any])?.[1] ?? ''}
                  onChange={(value: any) =>
                      column.setFilterValue((old: any) => [old?.[0], value])
                  }
                  placeholder={`Max ${
                      column.getFacetedMinMaxValues()?.[1]
                      ? `(${column.getFacetedMinMaxValues()?.[1]})`
                      : ''
                  }`}
              />
          </>
      )
  }

  return (
    <>
      <datalist id={column.id + 'list'}>
        {sortedUniqueValues.slice(0, 5000).map((value, index) => (
          <option value={value as any} key={index + '_' + value} />
        ))}
      </datalist>

      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '')}
        onChange={(value: any) => column.setFilterValue(value.trim())}
        placeholder={`${column.getFacetedUniqueValues().size} Items`}
        list={column.id + 'list'}
      />
    </>
  )
}

import { FilterFn, } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { useMemo } from 'react'
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
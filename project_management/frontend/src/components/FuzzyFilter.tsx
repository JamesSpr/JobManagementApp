
import { FilterFn, } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { useMemo } from 'react'
import { Column, Table as ReactTable } from '@tanstack/react-table'
import DebouncedInput from './DebouncedInput'

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta({
    itemRank,
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}

export const TableFilter = ({column, table, dateColumns} : {column: Column<any>, table: ReactTable<any>, dateColumns?: string[]}) => {
  const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id)

  const columnFilterValue = column.getFilterValue()
  
  const sortedUniqueValues = useMemo(
    () =>
      typeof firstValue === 'number'
        ? [] 
        : Array.from(column.getFacetedUniqueValues().keys()).sort(),
    [column.getFacetedUniqueValues()]
  )

  if(dateColumns && dateColumns.includes(column.id)) {
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
        onChange={(value: any) => column.setFilterValue(value)}
        placeholder={`${column.getFacetedUniqueValues().size} Items`}
        list={column.id + 'list'}
      />
    </>
  )
}

export default fuzzyFilter
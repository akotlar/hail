from hail.typecheck import *
from hail.utils.java import escape_parsable
from hail.expr.types import dtype, tstruct
from hail.utils.java import jiterable_to_list

class tmatrix(object):
    @staticmethod
    def _from_java(jtt):
        return tmatrix(
            dtype(jtt.globalType().toString()),
            dtype(jtt.colType().toString()),
            jiterable_to_list(jtt.colKey()),
            dtype(jtt.rowType().toString()),
            jiterable_to_list(jtt.rowKey()),
            dtype(jtt.entryType().toString()))

    @typecheck_method(global_type=tstruct,
                      col_type=tstruct, col_key=sequenceof(str),
                      row_type=tstruct, row_key=sequenceof(str),
                      entry_type=tstruct)
    def __init__(self, global_type, col_type, col_key, row_type, row_key, entry_type):
        self.global_type = global_type
        self.col_type = col_type
        self.col_key = col_key
        self.row_type = row_type
        self.row_key = row_key
        self.entry_type = entry_type

    def __eq__(self, other):
        return (isinstance(other, ttable)
                and self.global_type == other.global_type
                and self.col_type == other.col_type
                and self.col_key == other.col_key
                and self.row_type == other.row_type
                and self.row_key == other.row_key
                and self.entry_type == other.entry_type)

    def __hash__(self):
        return 43 + hash(str(self))

    def __repr__(self):
        return f'tmatrix(global_type={self.global_type!r}, col_type={self.col_type!r}, col_key={self.col_key!r}, row_type={self.row_type!r}, row_key={self.row_key!r}, entry_type={self.entry_type!r})'

    def _row_key_str(self):
        return ', '.join([escape_parsable(k) for k in self.row_key])

    def _col_key_str(self):
        return ', '.join([escape_parsable(k) for k in self.col_key])

    def __str__(self):
        return f'matrix {{global: {self.global_type}, col: {self.col_type}, col_key: {self._col_key_str()}, row: {self.row_type}, row_key: [{self._row_key_str()}], entry: {self.entry_type}}}'

    def pretty(self, indent=0, increment=4):
        l = []
        l.append(' ' * indent)
        l.append('matrix {\n')
        indent += increment
        
        l.append(' ' * indent)
        l.append('global: ')
        self.global_type._pretty(l, indent, increment)
        l.append(',\n')
        
        l.append(' ' * indent)
        l.append('row: ')
        self.row_type._pretty(l, indent, increment)
        l.append(',\n')
        
        l.append(' ' * indent)
        l.append(f'row_key: [{self._row_key_str()}],\n')
        
        l.append(' ' * indent)
        l.append('col: ')
        self.col_type._pretty(l, indent, increment)
        l.append(',\n')
        
        l.append(' ' * indent)
        l.append(f'col_key: [{self._col_key_str()}],\n')
        
        l.append(' ' * indent)
        l.append('entry: ')
        self.entry_type._pretty(l, indent, increment)
        l.append('\n')
        
        indent -= increment
        l.append(' ' * indent)
        l.append('}')
        
        return ''.join(l)


import pprint

_old_printer = pprint.PrettyPrinter


class PrettyPrinter(pprint.PrettyPrinter):
    def _format(self, object, stream, indent, allowance, context, level):
        if isinstance(object, tmatrix):
            stream.write(object.pretty(self._indent_per_level))
        else:
            return _old_printer._format(self, object, stream, indent, allowance, context, level)


pprint.PrettyPrinter = PrettyPrinter  # monkey-patch pprint

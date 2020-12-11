# Annoying this about hail
No assignment of arrays…
b = hl.arange(hl.int32(shape_min))
b[1,1] = 1
`’ArrayNumericExpression’ object does not support item assignment`

Hail upcasts pow to floats  maybe this is python (no `In [1]: 2 ** 2                                                                                                                                                                      
Out[1]: 4`)

```python
N = 4
M = 4
n_row = hl.int32(N)
if M is None:
	n_col = n_row
else:
	n_col =  hl.int32(M)

shape_product = n_row * n_col
n_rows_square = hl.cond(n_row <= n_col, n_row, n_col)
max_elem_float = hl.eval(n_rows_square ** 2)
max_elem_int = hl.eval(n_rows_square * n_rows_square)
```

NDArray reshape doesn’t take row/column major


Thanks. Here are some notes:
1) We do not support NDArray mutation, i.e `nd[1,1] = 2` doesn't work. This seems like a large deviation from the Numpy API, and I think would be useful to support if we want more Numpy users. This is so fundamental that Numpy even use this __setitem__ internally (e.g `np.eye`). Similarly, I think it's problematic that we don't allow element mutation of ArrayExpression's.

2) Hail `pow` returns a float even if operand is an int. hl.literal(5, dtype=hl.tint32) ** 2 should not give a float64. `hl.literal(5, dtype=hl.tint32)  * hl.literal(5, dtype=hl.tint32) ` does not give this result.

3) Our Numpy method signatures differ in some keys ways from Numpy. Example: we currently cannot specify column/row major for reshape.

```
> I'm back, feel free to assign me to some of these ndarray things. (Also let me know issues you run into when adding stuff)

Thanks. Here are some notes:
1) We do not support NDArray mutation, i.e `nd[1,1] = 2` doesn't work. This seems like a large deviation from the Numpy API, and I think would be useful to support if we want more Numpy users. This is so fundamental that Numpy even use this __setitem__ internally (e.g `np.eye`). Similarly, I think it's problematic that we don't allow element mutation of ArrayExpression's.

2) Hail `pow` returns a float even if operand is an int. hl.literal(5, dtype=hl.tint32) ** 2 should not give a float64. `hl.literal(5, dtype=hl.tint32)  * hl.literal(5, dtype=hl.tint32) ` does not give this result.

3) Our Numpy method signatures differ in some keys ways from Numpy. Example: we currently cannot specify column/row major for reshape.

```


This doesn’t work:

```python
import numpy as np
ranA = np.random.rand(10,3)
A = np.asmatrix(ranA)
Ah = hl.nd.array(ranA)
ranB = np.random.rand(10,1)
b = np.asmatrix(ranB)
print(ranB)
bh = hl.nd.array(ranB)
I = np.identity(A.shape[1])
Ih = hl.nd.eye(Ah.shape[1])
alpha = 1
x = np.linalg.inv(A.T*A + alpha * I)*A.T*b

xHail = hl.nd.inv(Ah.T@A + alpha * Ih) @ (Ah.T@bh)
print("xHail", hl.eval(xHail))
# returns  HailException: cannot set missing field for required type +PFloat64

# same
xHail = hl.nd.inv(A.T@A + alpha * I) @ (A.T@b)
print("xHail", hl.eval(xHail))

# works
xHail = hl.nd.inv(Ah.T@Ah + alpha * Ih) @ (Ah.T@bh)
print("xHail", hl.eval(xHail))

```


We can drop any field, but for fuckign selecting fields we need to use special syntax, per field type.

Similarly, we can’t just “key by” we need to key_rows_by("locus”).

matrixtable.py: “matrix has no field ‘alleles’


mt.rows().show() and mt.rows().select().show() give different results. The former shows all row fields, the latter only shows locus and allele…

It’s not clear to me when I can use ndarray objects vs when I need ndarray expressions. For instance, the example above of not being able to do matmul with ndarray operands (both ,left, or right)

We can’t use tuples for ndarrays, which means some ndarray examples don’t work, i.e

*>>>*a = np.array((1,2,3))
*>>>*b = np.array((2,3,4))
*>>>*np.hstack((a,b))


I can’t select the ndarray element type (meaning the base element type). That’s super annoying. No, instead I need to traverse down to the primitive level and presumably cast the fucking thing.

How, in general do I cast? Do I just use hl.literal? That seems very awkward. Numpy has [numpy.ndarray.astype — NumPy v1.19 Manual](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.astype.html)
	* Note that they realize that the specifics of the *collection* do not matter. When people want to cast the type of an array, they only mean the primitive/str being held.

Except I can’t even cast using `hl.literal`. What in the actual fuck:

```
In [7]: afloat = hl.literal(a, dtype=hl.tarray(hl.tfloat64))                                                                                           
---------------------------------------------------------------------------
TypeError                                 Traceback (most recent call last)
~/projects/hail/hail/python/hail/expr/functions.py in literal(x, dtype)
    206     try:
--> 207         dtype._traverse(x, typecheck_expr)
    208     except TypeError as e:

~/projects/hail/hail/python/hail/expr/types.py in _traverse(self, obj, f)
    729     def _traverse(self, obj, f):
--> 730         if f(self, obj):
    731             for elt in obj:

~/projects/hail/hail/python/hail/expr/functions.py in typecheck_expr(t, x)
    188             if x.dtype != t:
--> 189                 raise TypeError(f"'literal': type mismatch: expected '{t}', found '{x.dtype}'")
    190             elif x._indices.source is not None:

TypeError: 'literal': type mismatch: expected 'array<float64>', found 'array<int32>'

The above exception was the direct cause of the following exception:

TypeError                                 Traceback (most recent call last)
<ipython-input-7-85dd05a6669d> in <module>
----> 1 afloat = hl.literal(a, dtype=hl.tarray(hl.tfloat64))

<decorator-gen-736> in literal(x, dtype)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
    612     def wrapper(__original_func, *args, **kwargs):
    613         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
--> 614         return __original_func(*args_, **kwargs_)
    615 
    616     return wrapper

~/projects/hail/hail/python/hail/expr/functions.py in literal(x, dtype)
    208     except TypeError as e:
    209         raise TypeError("'literal': object did not match the passed type '{}'"
--> 210                         .format(dtype)) from e
    211 
    212     if wrapper['has_expr']:

TypeError: 'literal': object did not match the passed type 'array<float64>'

```



NDArray inv really really needs an inversion that is single precision

Our arange doesn’t support floats…fuck you

I can’t use an expression (A FUCKING STRING) as the key in my annotation

```python
for alpha in alphas:
	ht.select(f"B_{alpha}" = ...)
# keyword can't be an expression
```  

This also doesn’t work:
```
for i in range(alphas):
    ht2 = ht.select(ht.alphaFields[i] = hl.nd.inv(ht.block @ ht.block.T + alpha * hl.nd.eye(ht.block.shape[0])) @ (ht.block @ ht.Y))
```

What in the fuck

This feels almost like a joke, the description for “select” is


[image:0C1E8A79-9FB3-4FE1-A758-B8998D32871D-5949-000054B2A0EC9180/Screen Shot 2020-07-22 at 11.50.48 PM.png]

Oh, so they want “named args” for things that

But I can do this: `ht2 = ht.annotate(**exprs)` where exprs is a dictionary

This feels very much like it would require a fairly close understanding of Python to do correctly. Spread operators aren’t exactly common.

It’s incredibly annoying that .select() or .annotate() consumes fields. That’s just not how other languages I’m familiar with work. SQL doesn’t work like that. Again, wtf


`ht2[someField]`
“Cannot index with a scalar expression”
- seriously fuck off

This works:
```
ht2 = ht2.annotate(W = [ht2[field]._data_array() for field in alphaFields])
ht2 = ht2.annotate(W2 = hl.nd.array(ht2.W))
```

But not this:

`ht2 = ht2.annotate(W = hl.nd.array([ht2[field]._data_array() for field in alphaFields]))`

(Minor one: There is an ArrayExpression.length() but no NDArrayExpression.length(). NDArray should be largely a superset of ArrayExpression(). Ah, but it does have size()). Nope it doesn’t

Fold documentation makes no mention of the allowed types of the collection you fold over:
[CollectionExpression — Hail](https://hail.is/docs/0.2/hail.expr.CollectionExpression.html#hail.expr.CollectionExpression.fold)
[image:F40139DE-91F3-4E40-8CA6-A50225484D25-5949-00006528AE6ECDF0/Screen Shot 2020-07-23 at 11.32.06 AM.png]

You can’t fold one an NDArray

Also what the fuck!
```
ht2 = ht2.annotate(Wmean = hl.fold(lambda i, j: i + j, 0.0, ht2.W)/ ht2.Wnd.size())
ExpressionException: ‘CollectionExpression.fold’ must take function returning same expression type as zero value: 
    zero.dtype: float64
    f.dtype: array<float64>
```


Can’t type check one thing:

```
@typecheck(dtype=nullable(HailType))
def array(input_array, dtype)
```

Can’t make a fucking array from a tuple…
```python

In [13]: a1 = hl.literal([hl.array((1,2,3)), hl.array((4,5,6))])                                                                                       
---------------------------------------------------------------------------
ExpressionException                       Traceback (most recent call last)
~/projects/hail/hail/python/hail/expr/expressions/expression_typecheck.py in check(self, x, caller, param)
     76         try:
---> 77             return self.coerce(to_expr(x))
     78         except ExpressionException as e:

~/projects/hail/hail/python/hail/expr/expressions/expression_typecheck.py in coerce(self, x)
     61         if not self.can_coerce(x.dtype):
---> 62             raise ExpressionException(f"cannot coerce type '{x.dtype}' to type '{self.str_t}'")
     63         if self._requires_conversion(x.dtype):

ExpressionException: cannot coerce type 'tuple(int32, int32, int32)' to type 'set<any> or array<any> or dict<('any', 'any')>'

The above exception was the direct cause of the following exception:

TypecheckFailure                          Traceback (most recent call last)
~/projects/hail/hail/python/hail/typecheck/check.py in check_all(f, args, kwargs, checks, is_method)
    540                         arg = args[i]
--> 541                         args_.append(checker.check(arg, name, arg_name))
    542                     # passed as keyword

~/projects/hail/hail/python/hail/expr/expressions/expression_typecheck.py in check(self, x, caller, param)
     78         except ExpressionException as e:
---> 79             raise TypecheckFailure from e
     80 

TypecheckFailure: 

The above exception was the direct cause of the following exception:

TypeError                                 Traceback (most recent call last)
<ipython-input-13-92db336701e0> in <module>
----> 1 a1 = hl.literal([hl.array((1,2,3)), hl.array((4,5,6))])

<decorator-gen-958> in array(collection)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
    611     @decorator
    612     def wrapper(__original_func, *args, **kwargs):
--> 613         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
    614         return __original_func(*args_, **kwargs_)
    615 

~/projects/hail/hail/python/hail/typecheck/check.py in check_all(f, args, kwargs, checks, is_method)
    565                                     expected=checker.expects(),
    566                                     found=checker.format(arg)
--> 567                                 )) from e
    568         elif param.kind == param.VAR_POSITIONAL:
    569             # consume the rest of the positional arguments

TypeError: array: parameter 'collection': expected expression of type set<any> or array<any> or dict<('any', 'any')>, found tuple: (1, 2, 3)

```


Slightly surprising: a map over NDArrays doesn’t create an array
```
# same result with ht2 = ht2.annotate(WMean = hl.map(lambda arr: hl.mean(arr), ht2.W))
ht2 = ht2.annotate(WMean = ht2.W.map(lambda arr: hl.mean(arr)))
ht2.describe()
----------------------------------------
Global fields:
    'Y': ndarray<float64, 1> 
    'alphas': array<float64> 
    'alphaFields': array<str> 
    'snp_block_idx_field': str 
    'n_variants_per_block': int32 
    'n_block_rows': int32 
----------------------------------------
Row fields:
    'r': int32 
    'block': ndarray<int32, 2> 
    'XtX': ndarray<int32, 2> 
    'XtY': ndarray<float64, 1> 
    'I': ndarray<float64, 2> 
    '__uid_8': ndarray<float64, 1> 
    '__uid_9': ndarray<float64, 1> 
    'W': ndarray<array<float64>, 1> 
    'WMean': ndarray<float64, 1> 
----------------------------------------
Key: ['r']
----------------------------------------

# Especially since doc says it should return a set or a map
# :class:`.ArrayExpression` or :class:`SetExpression`.
#        Collection where each element has been transformed by #`f`.

```


Collecting 3 fields takes 3x as long
https://www.dropbox.com/s/apkez7a2gan1jeu/Screen%20Shot%202020-07-23%20at%203.52.56%20PM.png?dl=0

Need to specify dimensions in full (no ellipsis) in hl.nd.array
```python
In [47]: a                                                                                                                                             
Out[47]: 
array([[ 1,  2,  3,  4,  5],
       [ 6,  7,  8,  9, 10]])

In [48]: a = a.T                                                                                                                                       

In [49]: a[...,0]                                                                                                                                      
Out[49]: array([1, 2, 3, 4, 5])

In [50]: ah = hl.nd.array(a)                                                                                                                           

In [51]: hl.eval(ah[...,0])    
```
* but this works: 
```
In [53]: hl.eval(ah[:,1])                                                                                                                              
Out[53]: array([ 6,  7,  8,  9, 10])
```

`ht2 = ht2.annotate(WiMean = hl.nd.array(hl.range(2).map(lambda kIdx: ( hl.sum(ht2.Wi[:, kIdx])) / ht2.Wi[:, kIdx].size)))`
* hl.sum cannot sum ndarrays…

How do I case from an ndarray to an array so that I can fold/sum?

How do I join a tuple into a string, and then replace the axis with a  “,:”

How the flying fuck do I reduce ( multiply ) a tuple (aka the shape of the ndarray. Mother fuckers)

For some reason this drops all of my fucking row fields, besides “entries”. Why in the fuck…
```python
ht = ht.group_by(ht.r).aggregate(
    entries=hl.sorted(
        hl.agg.collect(hl.struct(row_index=ht[row_index], entries=ht[entries])),
        key=lambda x: x.row_index
    ).map(lambda x: x.entries))
```
	* I guess this makes sense…aggregating over rows, so it must want me to specify that I want to aggregate over some othe too..

Allele count counting reference seems stupid. VCF AC is alt only, why make ours different? Also, it’s trivial to count ref count for AC + AN?

God it’s so annoying that this doesn’t work: `hl.literal(ht.af, hl.tfloat32)`
* complains that type doesn’t match…ugh no shit that’s why I passed win the type. ht.af already has a type dumbass, so if I’m passing one it’s because I’m telling you to cast, like float(number)

This doesn’t work: `ht = ht.annotate(**ht.entries)` where `entries` is a StructExpression.
Yet this works: `ht = ht.annotate(**{entries: ht[entries][entrc_field]})`

`hl.mean(x)` doesn’t work if x is a python array of floats

In general, I would much rather have an api that can dispatch sklearn routines to many cores, than something that builds an expression graph, unless those nodes can include aribtrary commands (batch-like)


This syntax is asinine:
```python
ht2.group_by(ht2.g).aggregate(
    hl.sorted(
        hl.agg.collect(ht2.WiNormalized),
        key=lambda x: x.row_index
    ))

<ipython-input-222-bd3569e67dbc> in <lambda>(x)
     32     hl.sorted(
     33         hl.agg.collect(ht2.WiNormalized),
---> 34         key=lambda x: x.row_index
     35     ))
     36 

AttributeError: 'NDArrayNumericExpression' object has no attribute 'row_index'
```
* it’s fucking expecting the thing in  collect to be a struct with some field it can sort. What in the hell, it’s taking the first argument as s function in the second but not explicitly

I can’t make `ht3.annotate(Wnd = hl.nd.array(ht3.W)).show()` where ht3.W is array<ndarray<float64, 2>>. Awful

I can’t append a row (easily) to a table

Why is this shape `np.array(ht3.explode("W").W.take(1)[0]).shape` (1,100,2) and not 100, 2
* `np.array(ht3.W.take(1)[0]).shape` is (20, 100, 2)… if I explode on dimension 1 I want 20 (100,2) arrays?
* `ht3.explode("W").describe()` shows <array<array<float64>> , so why the fuck does take introduce a new dimension?


Doesn’t work:
```python
################# A version that tries to avoid the performance cliff above ###############
# Equation 14 in https://www.biorxiv.org/content/10.1101/2020.06.19.162354v2.full.pdf
# 􏰉λ =(GTi Gi +λIMi)−1GTi y􏰊, λ∈Λ
exprs = {}
for i in range(len(alphas)):
    exprs[alphaFields[i]] = hl.nd.inv(ht2.XtX + ht2.alphas[i] * ht2.I) @ ht2.XtY
print(exprs)
# ht2 = ht2.annotate(**exprs)
ht2 = ht2.annotate(B = hl.nd.vstack([ht2[field] for field in alphaFields]))
```

Doesn’t work:
`ht3 = ht3.aggregate(hl.agg.collect(ht3.WiNormalized._data_array()))
ht3.show()`
* “list object has no method show”

Doesn’t work:
```ht3 = ht3.aggregate(W = hl.agg.collect(ht3.WiNormalized._data_array()))
TypeError: aggregate() got an unexpected keyword argument 'W'
```

But this works:
```
ht3 = ht2.annotate(g = 0)
# # ._data_array() because we can't make ndarrays from array<ndarray<>> yet
ht3 = ht3.group_by(ht3.g).aggregate(W = hl.agg.collect(ht3.WiNormalized._data_array()))

ht3.describe()
```
* What in the flying fuck. Same function (apparently, something on table), works dramatically differently

Can’t seem to .or_error without a when(). I can’t do `hl.all(lambda x: x == false).or_error(“fuck you”)` (boolean expression has no or_error).


This does not work, even when I allow array expressions in concatenate (and update NDArrayConcat in python to get the right element_type in _compute_type)
```python
ht3 = ht3.group_by(ht3.g).aggregate(W = hl.nd.hstack(hl.agg.collect(ht3.WiNormalized)))

concat_ir typ is ndarray<float64, 2>

---------------------------------------------------------------------------
TypeError                                 Traceback (most recent call last)
<ipython-input-15-d1308235423e> in <module>
     52 ht3 = ht2.annotate(g = 0)
     53 # # ._data_array() because we can't make ndarrays from array<ndarray<>> yet
---> 54 ht3 = ht3.group_by(ht3.g).aggregate(W = hl.nd.hstack(hl.agg.collect(ht3.WiNormalized)))
     55 
     56 ht3.describe()

<decorator-gen-1773> in hstack(arrs)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
    612     def wrapper(__original_func, *args, **kwargs):
    613         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
--> 614         return __original_func(*args_, **kwargs_)
    615 
    616     return wrapper

~/projects/hail/hail/python/hail/nd/nd.py in hstack(arrs)
    499         axis = 1
    500 
--> 501     return concatenate(arrs, axis)

<decorator-gen-1765> in concatenate(nds, axis)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
    612     def wrapper(__original_func, *args, **kwargs):
    613         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
--> 614         return __original_func(*args_, **kwargs_)
    615 
    616     return wrapper

~/projects/hail/hail/python/hail/nd/nd.py in concatenate(nds, axis)
    318     makearr = aarray(nds)
    319     concat_ir = NDArrayConcat(makearr._ir, axis)
--> 320     print("concat_ir typ is", concat_ir.typ)
    321     return construct_expr(concat_ir, concat_ir.typ)
    322 

~/projects/hail/hail/python/hail/ir/base_ir.py in typ(self)
    224     def typ(self):
    225         if self._type is None:
--> 226             self._compute_type({}, None)
    227             assert self._type is not None, self
    228         return self._type

~/projects/hail/hail/python/hail/ir/ir.py in _compute_type(self, env, agg_env)
    874                 self.nds.args._compute_type(env, agg_env)
    875         else:
--> 876             self.nds._compute_type(env, agg_env)
    877 
    878         self._type = self.nds.typ.element_type

~/projects/hail/hail/python/hail/ir/ir.py in _compute_type(self, env, agg_env)
   1640             a._compute_type(env, agg_env)
   1641         for a in self.seq_op_args:
-> 1642             a._compute_type(agg_env, None)
   1643 
   1644         self._type = lookup_aggregator_return_type(

~/projects/hail/hail/python/hail/ir/ir.py in _compute_type(self, env, agg_env)
   1848 
   1849     def _compute_type(self, env, agg_env):
-> 1850         self.o._compute_type(env, agg_env)
   1851         self._type = self.o.typ[self.name]
   1852 

~/projects/hail/hail/python/hail/ir/ir.py in _compute_type(self, env, agg_env)
    388 
    389     def _compute_type(self, env, agg_env):
--> 390         assert self.name in env, f'{self.name} not found in {env}'
    391         self._type = env[self.name]
    392 

TypeError: argument of type 'NoneType' is not iterable
```


This also doesn’t work:
```python
ht3 = ht3.group_by(ht3.g).aggregate(W = hl.agg.collect(ht3.WiNormalized))
ht3 = ht3.annotate(Wstack = hl.nd.hstack(ht3.W))

concat_ir typ is ndarray<float64, 2>

---------------------------------------------------------------------------
AssertionError                            Traceback (most recent call last)
<ipython-input-16-d5d25ad451e3> in <module>
*53* # # ._data_array() because we can't make ndarrays from array<ndarray<>> yet
*54* ht3 = ht3.group_by(ht3.g).aggregate(W = hl.agg.collect(ht3.WiNormalized))
---> 55 ht3 = ht3.annotate(Wstack = hl.nd.hstack(ht3.W))
*56* 
*57* ht3.describe()

<decorator-gen-1773> in hstack(arrs)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
*612*     def wrapper(__original_func, *args, **kwargs):
*613*         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
—> 614         return __original_func(*args_, **kwargs_)
*615* 
*616*     return wrapper

~/projects/hail/hail/python/hail/nd/nd.py in hstack(arrs)
*499*         axis = 1
*500* 
—> 501     return concatenate(arrs, axis)

<decorator-gen-1765> in concatenate(nds, axis)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
*612*     def wrapper(__original_func, *args, **kwargs):
*613*         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
—> 614         return __original_func(*args_, **kwargs_)
*615* 
*616*     return wrapper

~/projects/hail/hail/python/hail/nd/nd.py in concatenate(nds, axis)
*318*     makearr = aarray(nds)
*319*     concat_ir = NDArrayConcat(makearr._ir, axis)
—> 320     print(“concat_ir typ is”, concat_ir.typ)
*321*     return construct_expr(concat_ir, concat_ir.typ)
*322* 

~/projects/hail/hail/python/hail/ir/base_ir.py in typ(self)
*224*     def typ(self):
*225*         if self._type is None:
—> 226             self._compute_type({}, None)
*227*             assert self._type is not None, self
*228*         return self._type

~/projects/hail/hail/python/hail/ir/ir.py in _compute_type(self, env, agg_env)
*874*                 self.nds.args._compute_type(env, agg_env)
*875*         else:
—> 876             self.nds._compute_type(env, agg_env)
*877* 
*878*         self._type = self.nds.typ.element_type

~/projects/hail/hail/python/hail/ir/ir.py in _compute_type(self, env, agg_env)
*1848* 
*1849*     def _compute_type(self, env, agg_env):
-> 1850         self.o._compute_type(env, agg_env)
*1851*         self._type = self.o.typ[self.name]
*1852* 

~/projects/hail/hail/python/hail/ir/ir.py in _compute_type(self, env, agg_env)
*388* 
*389*     def _compute_type(self, env, agg_env):
—> 390         assert self.name in env, f’{self.name} not found in {env}’
*391*         self._type = env[self.name]
*392* 

AssertionError: row not found in {}
```
Which is the same issue I’ve seen before, when trying to apply some operations (see above) to table expressions

Numpy slicing syntax is totally broken:
https://www.dropbox.com/s/bemcbjvi6i4jeli/Screenshot%202020-07-25%2016.16.18.png?dl=0

```
In [90]: hl.eval(mat[9:0:-1,0])                                                                                                                        
dlen issss 2 s.step -1 s.start 9 s.stop 0
res slice is (9, 0, -1)
Out[90]: array([-1,  0,  7,  3,  6,  2,  5,  1,  4])

In [91]: np_mat[9:0:-1,0]                                                                                                                              
Out[91]: array([4])
```


With my new syntax:

```
In [127]: hl.eval(mat[9::-1,0])                                                                                                                        
n_sliced_dims are 1
dlen issss 2 s.step -1 s.start 9 s.stop None
res is  (2, -1, -1)
Out[127]: array([1, 4, 0])

In [128]: hl.eval(np_mat[9::-1,0])                                                                                                                     
Out[128]: array([4, 0])
```


WTF hail:

```python

In [9]: ht = ht.annotate(z = hl.array([hl.nd.array([1,2,3], hl.nd.array([4,5,6]))]))                                                                                                                                       
—————————————————————————————————————
TypeError                                 Traceback (most recent call last)
<ipython-input-9-4737ed9e26a2> in <module>
——> 1 ht = ht.annotate(z = hl.array([hl.nd.array([1,2,3], hl.nd.array([4,5,6]))]))

~/projects/hail/hail/python/hail/nd/nd.py in array(input_array, dtype)
     49         An ndarray based on the input array.
     50     “””
—> 51     return _ndarray(input_array, dtype=dtype)
     52 
     53 

~/projects/hail/hail/python/hail/expr/functions.py in _ndarray(collection, row_major, dtype)
   4196         ndim = builtins.len(shape)
   4197 
-> 4198     data_expr = data_expr.map(lambda value: cast_expr(value, dtype))
   4199     ndir = ir.MakeNDArray(data_expr._ir, shape_expr._ir, hl.bool(True)._ir)
   4200 

<decorator-gen-606> in map(self, f)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
    612     def wrapper(__original_func, *args, **kwargs):
    613         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
—> 614         return __original_func(*args_, **kwargs_)
    615 
    616     return wrapper

~/projects/hail/hail/python/hail/expr/expressions/typed_expressions.py in map(self, f)
    336             return a
    337 
—> 338         array_map = hl.array(self)._ir_lambda_method(transform_ir, f, self._type.element_type, lambda t: self._type.__class__(t))
    339 
    340         if isinstance(self._type, tset):

~/projects/hail/hail/python/hail/expr/expressions/base_expression.py in _ir_lambda_method(self, irf, f, input_type, ret_type_f, *args)
    623         new_id = Env.get_uid()
    624         lambda_result = to_expr(
—> 625             f(expressions.construct_variable(new_id, input_type, self._indices, self._aggregations)))
    626 
    627         indices, aggregations = unify_all(self, lambda_result)

~/projects/hail/hail/python/hail/typecheck/check.py in f(*args)
    362 
    363         def f(*args):
—> 364             ret = x(*args)
    365             try:
    366                 return self.ret_checker.check(ret, caller, param)

~/projects/hail/hail/python/hail/expr/functions.py in <lambda>(value)
   4196         ndim = builtins.len(shape)
   4197 
-> 4198     data_expr = data_expr.map(lambda value: cast_expr(value, dtype))
   4199     ndir = ir.MakeNDArray(data_expr._ir, shape_expr._ir, hl.bool(True)._ir)
   4200 

~/projects/hail/hail/python/hail/expr/expressions/base_expression.py in cast_expr(e, dtype)
    209 
    210 def cast_expr(e, dtype=None) -> ‘Expression’:
—> 211     if not dtype:
    212         dtype = impute_type(e)
    213     x = _to_expr(e, dtype)

~/projects/hail/hail/python/hail/expr/expressions/base_expression.py in __len__(self)
    641 
    642     def __len__(self):
—> 643         raise TypeError(“’Expression’ objects have no static length: use ‘hl.len’ for the length of collections”)
    644 
    645     def __hash__(self):

TypeError: ‘Expression’ objects have no static length: use ‘hl.len’ for the length of collections

```



hl.all doesn’t support tuples.. wtf

```python
In [10]: seq = (x, y)                                                                                                                                                                                                      

In [11]: hl.eval(hl.nd.hstack(seq))                                                                                                                                                                                        
---------------------------------------------------------------------------
ExpressionException                       Traceback (most recent call last)
~/projects/hail/hail/python/hail/expr/expressions/expression_typecheck.py in check(self, x, caller, param)
     76         try:
---> 77             return self.coerce(to_expr(x))
     78         except ExpressionException as e:

~/projects/hail/hail/python/hail/expr/expressions/expression_typecheck.py in coerce(self, x)
     61         if not self.can_coerce(x.dtype):
---> 62             raise ExpressionException(f"cannot coerce type '{x.dtype}' to type '{self.str_t}'")
     63         if self._requires_conversion(x.dtype):

ExpressionException: cannot coerce type 'tuple(ndarray<int32, 1>, ndarray<int32, 1>)' to type 'set<any> or array<any>'

The above exception was the direct cause of the following exception:

TypecheckFailure                          Traceback (most recent call last)
~/projects/hail/hail/python/hail/typecheck/check.py in check_all(f, args, kwargs, checks, is_method)
    540                         arg = args[i]
--> 541                         args_.append(checker.check(arg, name, arg_name))
    542                     # passed as keyword

~/projects/hail/hail/python/hail/expr/expressions/expression_typecheck.py in check(self, x, caller, param)
     78         except ExpressionException as e:
---> 79             raise TypecheckFailure from e
     80 

TypecheckFailure: 

The above exception was the direct cause of the following exception:

TypeError                                 Traceback (most recent call last)
<ipython-input-11-41bb1834bcff> in <module>
----> 1 hl.eval(hl.nd.hstack(seq))

<decorator-gen-1774> in hstack(arrs)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
    612     def wrapper(__original_func, *args, **kwargs):
    613         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
--> 614         return __original_func(*args_, **kwargs_)
    615 
    616     return wrapper

~/projects/hail/hail/python/hail/nd/nd.py in hstack(arrs)
    505         axis = 1
    506 
—> 507     return concatenate(arrs, axis)

<decorator-gen-1766> in concatenate(nds, axis)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
    612     def wrapper(__original_func, *args, **kwargs):
    613         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
—> 614         return __original_func(*args_, **kwargs_)
    615 
    616     return wrapper

~/projects/hail/hail/python/hail/nd/nd.py in concatenate(nds, axis)
    314     head_nd = nds[0]
    315     head_ndim = head_nd.ndim
—> 316     hl.case().when(hl.all(lambda a: a.ndim == head_ndim, nds), True).or_error(“Mismatched ndim”)
    317 
    318     makearr = aarray(nds)

<decorator-gen-910> in all(f, collection)

~/projects/hail/hail/python/hail/typecheck/check.py in wrapper(__original_func, *args, **kwargs)
    611     @decorator
    612     def wrapper(__original_func, *args, **kwargs):
—> 613         args_, kwargs_ = check_all(__original_func, args, kwargs, checkers, is_method=is_method)
    614         return __original_func(*args_, **kwargs_)
    615 

~/projects/hail/hail/python/hail/typecheck/check.py in check_all(f, args, kwargs, checks, is_method)
    565                                     expected=checker.expects(),
    566                                     found=checker.format(arg)
—> 567                                 )) from e
    568         elif param.kind == param.VAR_POSITIONAL:
    569             # consume the rest of the positional arguments

TypeError: all: parameter ‘collection’: expected expression of type set<any> or array<any>, found tuple: (<NDArrayNumericExpression of type ndarray<int32, 1>>, <NDArrayNumericExpression of type ndarray<int32, 1>>)
```


If I want to explode an ndarary, I can’t just do split, can I? I have to ht.explode(ht.ndfield), which then has to understand how to explode an NDArrayExpression…
	* what I want is a container that is agnostic to the type of the thing it contains, that only cares about distribution of the items it contains
		* it should define an interface that it can accept (say
	* ah, we could split our ndarray if we had that function, which would create an ArrayExpression<NDArrayExpression> and that would satisfy the interface

`ht3.annotate(sample_idx = sample_indices).show()` where sample_indices is the same length as the table generates


hl.range requires an int32. This didn’t work:
`hl.range(ht3.Wstack.shape[0])`
Had to be changed to:
`hl.range(hl.int(ht3.Wstack.shape[0]))`

Unclear where the boundary between tables and other expressions is. This doesn’t work, but other, very similar things do. I think this is an inv issue, because it tries to compute the type using .typ

```python
# TODO: can we avoid storing the bigger fold of indices?
# Also, sidx does not need to be 64 bit int
ht5 = ht4.group_by("fold_0").aggregate(WFold = hl.nd.vstack(hl.agg.collect(ht4.W2)), sidx = hl.agg.collect(ht4.sidx))
trainRow = ht5[ht5["fold_0"] == True]
testRow = ht5[ht5["fold_0"] == False]

Wtrain = trainRow.WFold
Wtest = testRow.WFold
sidxTrain = trainRow.sidx
sidxTest = testRow.sidx

Ytrain = sidxTrain.map(lambda i: ht5.Y[i])
Ytest = sidxTest.map(lambda i: ht5.Y[i])

Itrain = hl.nd.eye(Wtrain.shape[0])
Itest = hl.nd.eye(Wtest.shape[0])

bestIdx = 0

WtWtrain = Wtrain.T @ Wtrain
WtYtrain = Wtrain.T @ Ytrain
WtWtest = Wtest.T @ Wtest
WtYtest = Wtest.T @ Ytest

losses = []

for alpha in alphas:
    BetaHat = hl.nd.inv(WtWtrain + alpha * Itrain) @ WtYtrain
    BetaHat.collect()
[image:125A9E08-8400-45A1-8ED1-6F33CC0A413B-12923-00015A209AB5FCD1/Screen Shot 2020-07-28 at 7.34.00 PM.png]
```


Hail make no visual distinction between expressions that are indexed by something, and are therefore tables, and things that are not table-like, until those things fail.
https://www.dropbox.com/s/94rv6qsn6l10ht9/Screenshot%202020-07-28%2022.08.02.png?dl=0
	* Appears to be struct expression `<StructExpression of type struct{WFold: ndarray<float64, 2>...`
https://www.dropbox.com/s/pyrrg16r98uw04w/Screenshot%202020-07-28%2022.08.33.png?dl=0
	* `hl.eval(thisStruct)` fails with “ERROR:scope violation:’eval_timed’ expects expression indexed by []”
https://www.dropbox.com/s/alnvd6fb4x29g53/Screenshot%202020-07-28%2022.09.14.png?dl=0
	* `hl.eval(hl.struct())` works fine however
 
`ht6 = ht5[ht5["fold_0"] == True].annotate(WFold = 5)` to set WFold = 5 on just the True values of fold_0 column didn’t work. Likely user error on my end.
https://www.dropbox.com/s/6ak2kmr990d33yb/Screen%20Shot%202020-07-28%20at%2010.17.31%20PM.png?dl=0


Cannot assign items…
`Table object does not support assignment`
https://www.dropbox.com/s/tc86p07s5f0jvnq/Screen%20Shot%202020-07-28%20at%2010.18.29%20PM.png?dl=0


TableMapParittions seems to help this: [query Expose Table._map_partitions in Python by tpoterba · Pull Request #9142 · hail-is/hail · GitHub](https://github.com/hail-is/hail/pull/9142/files)


The tables and matrix tables don’t act anything like nd array matrix tables

Numeric indexing doesn’t seem to work, e.g `mt[0,0].show()` doesn’t work
https://www.dropbox.com/s/7dppoqqzmsu1pfs/Screen%20Shot%202020-07-28%20at%2010.50.01%20PM.png?dl=0
	* Thought helpful error message


`ht4.row_value`. This is a field that doesn’t exist but somehow works. It’s a 
`<StructExpression of type struct{W2: array<array<float64>>}>`

There is nothing named “row_value” in the description, and the struct above is missing the row key…
https://www.dropbox.com/s/2zniig1sre4zwh6/Screen%20Shot%202020-07-29%20at%208.51.22%20AM.png?dl=0
	* this is a MatrixTable API, 
[image:B8274354-78C7-4960-AE15-4BCDB07D3103-12923-000172DBA3D0A86E/Screen Shot 2020-07-29 at 8.51.22 AM.png]


again…annoying that values act differently in different contexts


Can’t create the result of a table filter.group_by.aggregate
`ht5 = ht4.annotate(WTrain = ht4.filter(ht4["fold_0"] == True).group_by("fold_0")).aggregate(hl.agg.collect(ht4.W2))`
https://www.dropbox.com/s/qj0dvn69e79wbt3/Screen%20Shot%202020-07-29%20at%209.03.30%20AM.png?dl=0


`ht4.row` seems to give same result as `ht4.row_value`
```python
<StructExpression of type struct{g: int32, W2: ndarray<float64, 1>, sidx: int64, fold_0: bool, fold_1: bool, fold_2: bool, fold_3: bool, fold_4: bool}>
```

[image:44A2027C-4A4F-4329-8A66-6FD97E220285-12923-000177362A17263C/Screen Shot 2020-07-29 at 10.11.08 AM.png]

This doesn’t create 3 groups, but 1
```python
ht5 = ht4.group_by(fold_idx = [0,1,2]) \
         .aggregate(train_test = hl.agg.group_by(hl.rand_bool(test_prob, seed=fold), hl.agg.collect(ht4.row)))
```
https://www.dropbox.com/s/fugs1rj0nzgewmw/Screen%20Shot%202020-07-29%20at%2010.14.01%20AM.png?dl=0


Table group_by doesn’t work the same as hail.expr.functions.group_by:
https://www.dropbox.com/s/p7atdchh1r1n32y/Screenshot%202020-07-29%2010.16.56.png?dl=0
https://www.dropbox.com/s/v02xg0jzfvhjaa7/Screenshot%202020-07-29%2010.16.51.png?dl=0

Can’t  use table map partitions to annotate:

```python
ht3._map_partitions(lambda rows: rows.flatmap(lambda r: hl.range(2).map(lambda x: r.annotate(f = hl.literal(r.g))))).show()
```

```python
ht3._map_partitions(lambda rows: rows.flatmap(lambda r: hl.range(2).map(lambda x: r.annotate(f = r.g)))).show()
```

https://www.dropbox.com/s/w4wf58tdd96e3o7/Screen%20Shot%202020-07-29%20at%207.29.39%20PM.png?dl=0
* assertion failed, difficult to read error



Batch:
Unlike Hail Query API, batch job commands mutate the job object, so switching between query and batch commands may seem more conspicuous.

```python
In [4]: j.command(‘echo “hello world”’)                                                                                                                                                                   
Out[4]: <hailtop.batch.job.Job at 0x7fb1d828a590>
```

I can create a `new_job` with the same name, n times.  I found it ambiguous: does this create duplicate jobs? Does this overwrite past jobs? Should be an error
```python
In [1]: import hailtop.batch as hb                                                                                                                                                                        

In [2]: b = hb.Batch(name='hello-serial')                                                                                                                                                                 

In [3]: s = b.new_job(name='j1')                                                                                                                                                                          

In [4]: s                                                                                                                                                                                                 
Out[4]: <hailtop.batch.job.Job at 0x7fe609dd8f10>

In [5]: s?                                                                                                                                                                                                

In [6]: s = b.new_job(name='j1') 
   ...:                                                                                                                                                                                                   

In [7]: s = b.new_job(name='j1') 
   ...:                            
```
There didn’t seem to be an easy way to inspect the dag
Since it returns a value, `new_job`  it didn’t immediately seem like batch state was mutated, to me. 

```python
# same with sink.depends_on, works fine with conflicting names
In [19]: b = hb.Batch(name=‘scatter’)                                                                                                                                                                     

In [20]: for name in [‘Alice’, ‘Alice’, ‘Alice’]: 
    …:      j = b.new_job(name=name) 
    …:      j.command(f’echo “hello {name}”’) 
    …:                                                                                                                                                                                                  

In [21]: b.run()                                                                                                                                                                                          
hello Alice
hello Alice
hello Alice
Batch completed successfully!


```

So maybe the job names don’t matter at all, except for UI? Anyway 
https://www.dropbox.com/s/wbhr1sndga6sitb/Screen%20Shot%202020-07-29%20at%207.29.01%20PM.png?dl=0

I can’t do:
```python
t = create_resource_group(filegroup = {
   pheonList: ["{root}_1.pheno", "{root}_2.pheno", ... ]
}

```


It seems you cannot just declare a resource group based on a prefix, alone. Instead you need to figure out the name (including extension) of each of the files in this resource group. In the case of regenie I needed to read the source code to figure this out. This is much too painful, and makes the number one complaint I heard about Batch, which was that containerizing programs is difficult, all the more relevant. 

Why do I declare an input group for a job on its `batch` (instanceof Batch), but output groups using Job instance? Meaning, why not Job instance for both, since job 2 may need input from job1’s output

I write permanent outputs using Batch() objects, rather than the job I want to write the output of. This means that if I have a separate function constructing my commands, I need to know which keywords I used to construct that object’s resource group
`b.*write_output*(j.ofile, 'output/hello.txt')`

* Seems strange that the job object doesn’t have a permanent folder/object to store outputs. (j.out) say.
* “All  [JobResourceFile](https://hail.is/docs/batch/api/resource/hailtop.batch.resource.JobResourceFile.html#hailtop.batch.resource.JobResourceFile)  are temporary files and must be written to a permanent location using *write_output()* if the output needs to be saved.”. So why is that defined on the batch?


Batch states completed correctly when not:
```
ERROR: Cannot open prediction list file : /tmp/batch/286e75/1/fit_bin_out_pred.list
cp: /tmp/batch/286e75/2/test_bin_out_firth_Y1.regenie: No such file or directory
cp: /tmp/batch/286e75/2/test_bin_out_firth_Y2.regenie: No such file or directory
Batch completed successfully!
```
* this error happened because resource groups are fucked
```python
s1out = {"log": f"{s1pre}.log", "pred_list": f"{s1pre}_pred.list"}
    # This is needed , listed in {s1pre}_pred.list file output from step 1
    for i in range(1, nphenos + 1):
        s1out[f"{s1pre}_{i}"] = f"{s1pre}_{i}.loco"

    if step1_args.lowmem:
        for i in range(1, nphenos + 1):
            pfile = f"{step1_args.lowmem_prefix}_l0_Y{i}"
            s1out[pfile] = pfile

    j1.declare_resource_group(out=s1out)

cmd2 += f" --pred {j1.out['pred_list']}"
# results in step 1 being run with
# --out /tmp/batch/286e75/1/out 
# results in step 2 being run with
# --pred /tmp/batch/286e75/1/fit_bin_out_pred.list
# now pred doesn't contain the appropriate extension
```
	* this makes it totally useless to pass a keyword argument that is not the prefix, and use {root}. This should just be constrained.

batch.write_output silently fails if batch.write_output is called before .run, which is totally unintuitive, except if you’re thinking about writing as a node on a DAG. Virtually no one will think this way. If you call write_output afterwards, it should be an error. 

`batch.write_output(j2[s2pre], f”./{args.outdir}/“)` does not actually write to an output dir
It 

Batch does not just docker run an image:
```python
Regenie Step 2 output files: 
{'log': 'test_bin_out_firth.log', 'test_bin_out_firth_Y1.regenie': 'test_bin_out_firth_Y1.regenie', 'test_bin_out_firth_Y2.regenie': 'test_bin_out_firth_Y2.regenie'}
              |==================================|
              |           REGENIE v1.0.5.4       |
              |==================================|

Copyright (c) 2020 Joelle Mbatchou and Jonathan Marchini.
Distributed under the MIT License.

ERROR :You must provide an output prefix using '--out'
For more information, visit the website: https://rgcgithub.github.io/regenie/

/bin/bash: line 1: --step: command not found
cp: /tmp/batch/0b7e23/2/test_bin_out_firth.log: No such file or directory
cp: /tmp/batch/0b7e23/2/test_bin_out_firth_Y1.regenie: No such file or directory
cp: /tmp/batch/0b7e23/2/test_bin_out_firth_Y2.regenie: No such file or directory
Command '#!/bin/bash

```
* the above happens when an entry point is specified in the docker image
* And batch doesn’t actually allow you to specify docker run commands, wtf!
```
 Regenie Step 2 output files: 
dict_values([‘test_bin_out_firth.log’, ‘test_bin_out_firth_Y1.regenie’, ‘test_bin_out_firth_Y2.regenie’])
/bin/bash: line 1: —entrypoint: command not found
/bin/bash: line 1: —entrypoint: command not found
```

Jobs are re-entrant even after the last reference to a Batch() instance is gone:

```python
In [7]: b = hb.Batch()                                                                                                                                                           

In [8]: j.command("djlkafsj")                                                                                                                                                    
Out[8]: <hailtop.batch.job.Job at 0x7f83a8575c50>

In [9]: b = hb.Batch()                                                                                                                                                           

In [10]: j.command("echo 1")                                                                                                                                                     
Out[10]: <hailtop.batch.job.Job at 0x7f83a8575c50>

In [11]: b.run()                                                                                                                                                                 
Batch completed successfully!

In [12]: j.image("ubuntu:18.04")                                                                                                                                                 
Out[12]: <hailtop.batch.job.Job at 0x7f83a8575c50>

In [13]: b.run()                                                                                                                                                                 
Batch completed successfully!

In [14]: b = hb.Batch()                                                                                                                                                          

In [15]: j = b.new_job(shell="bin/dajslfsa")                                                                                                                                     

In [16]: j.image("ubuntu:18.04")                                                                                                                                                 
Out[16]: <hailtop.batch.job.Job at 0x7f83a88949d0>

In [17]: j.command("echo 1")                                                                                                                                                     
Out[17]: <hailtop.batch.job.Job at 0x7f83a88949d0>

In [18]: b.run()                                                                                                                                                                 
docker: Error response from daemon: OCI runtime create failed: container_linux.go:349: starting container process caused "exec: \"bin/dajslfsa\": stat bin/dajslfsa: no such file or directory": unknown.
ERRO[0000] error waiting for container: context canceled 
Command '#!/bin/bash



# change cd to tmp directory
cd /tmp/batch/720a59


# 1: 
docker run --entrypoint='' -v /tmp/batch/720a59:/tmp/batch/720a59 -w /tmp/batch/720a59   ubuntu:18.04 bin/dajslfsa -c '{
echo 1
}'

' returned non-zero exit status 127.
None
---------------------------------------------------------------------------
CalledProcessError                        Traceback (most recent call last)
<ipython-input-18-bb3243ff4dee> in <module>
----> 1 b.run()

~/projects/hail/hail/python/hailtop/batch/batch.py in run(self, dry_run, verbose, delete_scratch_on_exit, **backend_kwargs)
    427 
    428         self._jobs = ordered_jobs
--> 429         return self._backend._run(self, dry_run, verbose, delete_scratch_on_exit, **backend_kwargs)
    430 
    431     def __str__(self):

~/projects/hail/hail/python/hailtop/batch/backend.py in _run(self, batch, dry_run, verbose, delete_scratch_on_exit, **backend_kwargs)
    230         else:
    231             try:
--> 232                 sp.check_call(script, shell=True)
    233             except sp.CalledProcessError as e:
    234                 print(e)

~/miniconda3/lib/python3.7/subprocess.py in check_call(*popenargs, **kwargs)
    361         if cmd is None:
    362             cmd = popenargs[0]
--> 363         raise CalledProcessError(retcode, cmd)
    364     return 0
    365 

CalledProcessError: Command '#!/bin/bash
```

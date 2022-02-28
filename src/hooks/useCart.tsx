import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get<Product>(`/products/${productId}`)
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      const alreadyInCart = cart.find(product => product.id === productId)

      if (!alreadyInCart) {
        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }])
          localStorage.setItem(
            '@RocketShoes:cart',
            JSON.stringify([...cart, { ...product, amount: 1 }])
          )
          return
        }
      }

      if (alreadyInCart) {
        if (stock.amount > alreadyInCart.amount) {
          const addProduct = cart.map(cartItem =>
            cartItem.id === productId
              ? {
                  ...cartItem,
                  amount: Number(cartItem.amount + 1)
                }
              : cartItem
          )
          setCart(addProduct)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(addProduct))
          return
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.find(product => product.id === productId)
      if (productExist) {
        const removeProduct = cart.filter(product => product.id !== productId)
        setCart(removeProduct)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeProduct))
      } else {
        toast.error('Erro na remoção do produto')
        return
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get(`/stock/${productId}`)

      if (amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const cartUpdated = cart.map(cartItem =>
        cartItem.id === productId
          ? {
              ...cartItem,
              amount: amount
            }
          : cartItem
      )
      setCart(cartUpdated)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}

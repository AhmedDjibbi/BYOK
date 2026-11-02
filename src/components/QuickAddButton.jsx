import { Cart, Plus } from './Icons'
import './QuickAddButton.css'

export default function QuickAddButton({ productName, disabled = false, onClick }) {
  return (
    <button
      type="button"
      className="quick-add"
      aria-label={`Add ${productName} to bag`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="quick-add__icon" aria-hidden="true">
        <Cart size={19} strokeWidth={1.8} />
        <span className="quick-add__plus">
          <Plus size={10} strokeWidth={2.5} />
        </span>
      </span>
    </button>
  )
}

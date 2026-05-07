pr = console.log
class VirtualGrid extends HTMLElement {
	constructor() {
		super()
		this.data = {}
		this.is_scroll_visible = false
	}

	connectedCallback() {
		this.innerHTML = `
			<canvas id="grid" tabindex=0 width=600 height=600 style="border: 1px solid black">
			</canvas>
		`
		this.canvas             = this.querySelector('#grid')
		this.ctx                = this.canvas.getContext('2d')
		this.canvas_width       = this.canvas.width
		this.canvas_height      = this.canvas.height
		this.scroll_width       = 2 * this.canvas.width / 100
		this.row_height         = this.canvas_height / 20
		this.scroll_position    = 0
		this.scroll_height      = 0
		this.total_grid_height  = 0
		this.mouse_scroll_delta = 100
		this.is_scroll_dragged  = false
	
		this.handleScroll = this.handleScroll.bind(this)
		this.keyDown      = this.keyDown.bind(this)
		this.mouseDown    = this.mouseDown.bind(this)
		this.mouseUp      = this.mouseUp.bind(this)
		this.mouseDrag    = this.mouseDrag.bind(this)

		this.canvas.addEventListener('wheel', this.handleScroll)
		this.canvas.addEventListener('keydown', this.keyDown)
		this.canvas.addEventListener('mousedown', this.mouseDown)
		this.canvas.addEventListener('mouseup', this.mouseUp)
		this.canvas.addEventListener('mousemove', this.mouseDrag)
	}

	disconnectedCallback() {
		this.canvas.removeEventListener('wheel', this.handleScroll)
		this.canvas.removeEventListener('keydown', this.keyDown)
		this.canvas.removeEventListener('mousedown', this.mouseDown)
		this.canvas.removeEventListener('mouseup', this.mouseUp)
		this.canvas.removeEventListener('mousemove', this.mouseDrag)
	}

	draw_scroll() {
		if (this.total_grid_height < this.canvas_height) {
			// do nothing, not visible
			this.is_scroll_visible = false
			this.canvas_width = this.canvas.width
		} else {
			// visible
			this.is_scroll_visible = true
			if (this.canvas_width == this.canvas.width) this.canvas_width -= this.scroll_width
			this.scroll_height = this.canvas_height * (this.canvas_height / this.total_grid_height)
			this.#draw_rect(this.canvas_width, 0, this.scroll_width, this.canvas_height)
			this.#draw_rect(this.canvas_width, this.scroll_position, this.scroll_width, this.scroll_height)
			this.#fill_rect(this.canvas_width, this.scroll_position, this.scroll_width, this.scroll_height, 'lightgrey')
		}
	}

	draw_grid() {
		// --- compute scroll -> content mapping ---
		let maxScroll = this.canvas_height - this.scroll_height
		let maxOffset = this.total_grid_height - this.canvas_height

		let content_offset = maxScroll > 0
			? (this.scroll_position / maxScroll) * maxOffset
			: 0

		let first_elem_index = Math.floor(content_offset / this.row_height)
		let yOffset = content_offset % this.row_height

		// how many rows fit on screen (+1 for partial)
		let visibleRowCount = Math.ceil(this.canvas_height / this.row_height) + 1

		// --- draw only visible rows ---
		for (let i = 0; i < visibleRowCount; i++) {
			let rowIndex = first_elem_index + i
			if (!(rowIndex in this.data)) break

			let row = this.data[rowIndex]

			// shift by scroll offset
			let start_y = i * this.row_height - yOffset

			let table_columns = row.length
			let row_width = this.canvas_width / table_columns

			// horizontal line
			this.#draw_line(0, start_y, this.canvas_width, start_y)

			let row_separator_x = 0

			for (let entry of row) {
				this.ctx.save()
				this.ctx.fillStyle = 'black'
				this.ctx.font = '12px arial'

				if (typeof entry == 'string') {
					this.ctx.textAlign = 'left'
					this.ctx.fillText(entry, row_separator_x + 3, start_y + this.row_height - 3)
				} else if (typeof entry == 'number') {
					this.ctx.textAlign = 'right'
					this.ctx.fillText(entry, row_separator_x + row_width - 3, start_y + this.row_height - 3)
				}

				// vertical separator
				this.#draw_line(
					row_separator_x,
					start_y,
					row_separator_x,
					start_y + this.row_height
				)

				row_separator_x += row_width
				this.ctx.restore()
			}
		}
	}

	redraw() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
		this.draw_scroll()
		this.draw_grid()
	}

	setData(params) {
		this.data = params
		this.data_length = Object.keys(params).length
		this.total_grid_height = this.row_height * this.data_length
		requestAnimationFrame(() => this.redraw())
	}

	// Event listeners

	handleScroll(e) {
		this.scroll_delta = this.mouse_scroll_delta * this.canvas_height / this.total_grid_height
		if (e.deltaY > 0) {
			// scroll down
			this.scroll_position += this.scroll_delta
			if (this.scroll_position >= this.canvas_height - this.scroll_delta - this.scroll_height)
				this.scroll_position = this.canvas_height - this.scroll_height
		} else {
			// scroll up
			this.scroll_position -= this.scroll_delta
			if (this.scroll_position <= 0)
				this.scroll_position = 0
		}
		requestAnimationFrame(() => this.redraw())
	}

	keyDown(e) {
		let scroll_delta = 2 * this.mouse_scroll_delta * this.canvas_height / this.total_grid_height
		if (e.key == 'PageDown') {
			this.scroll_position += scroll_delta
			if (this.scroll_position >= this.canvas_height - scroll_delta - this.scroll_height)
				this.scroll_position = this.canvas_height - this.scroll_height
		} else if (e.key == 'PageUp') {
			this.scroll_position -= scroll_delta
			if (this.scroll_position <= 0)
				this.scroll_position = 0
		}
		requestAnimationFrame(() => this.redraw())
	}

	mouseDown(e) {
		let x = e.offsetX
		let y = e.offsetY
		// scroll stuff
		if (x >= this.canvas_width && x <= this.canvas.width) {
			if (y >= this.scroll_position && y <= this.scroll_position + this.scroll_height) {
				// scroll drag
				this.is_scroll_dragged = true
			} else {
				// click on track
				this.scroll_position = y - this.scroll_height / 2
			}
		} else {
			// click on a cell
		}
		requestAnimationFrame(() => this.redraw())
	}

	mouseUp(e) {
		this.is_scroll_dragged = false
	}
	
	mouseDrag(e) {
		let x = e.offsetX
		let y = e.offsetY
		if (this.is_scroll_dragged) {
			this.scroll_position = y - this.scroll_height / 2
			if (this.scroll_position >= this.canvas_height - this.scroll_height)
				this.scroll_position = this.canvas_height - this.scroll_height
			if (this.scroll_position <= 0)
				this.scroll_position = 0
		requestAnimationFrame(() => this.redraw())
		}
	}

	// Utils
	#draw_rect(x, y, width, height) {
		this.ctx.beginPath()
		this.ctx.rect(x, y, width, height)
		this.ctx.stroke()
	}

	#fill_rect(x, y, width, height, color) {
		this.ctx.fillStyle = color
		this.ctx.fillRect(x, y, width, height)
		this.ctx.stroke()
	}

	#draw_line(start_x, start_y, end_x, end_y) {
		this.ctx.beginPath()
		this.ctx.moveTo(start_x, start_y)
		this.ctx.lineTo(end_x, end_y)
		this.ctx.stroke()
	}
}

customElements.define('virtual-grid', VirtualGrid)
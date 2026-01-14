import matplotlib.pyplot as plt
import matplotlib.animation as animation
import numpy as np
import os

# Configuration
OUTPUT_DIR = r"d:\Math\output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Data
# Dimensions: 2, 3, 4, 5, 6, 7, 8
# Values: 13 -> 13 (Stuck) -> 2500 (Breakthrough) -> 2500 (Stuck) -> 50000 (Breakthrough) -> 50000 (Stuck) -> 531441 (Final)
x_data = np.array([2, 3, 4, 5, 6, 7, 8])
y_data = np.array([13, 13, 2500, 2500, 50000, 50000, 531441])

# Point Metadata
# Types: 'start', 'stuck', 'breakthrough', 'stuck', 'breakthrough', 'stuck', 'final'
point_types = ['start', 'stuck', 'breakthrough', 'stuck', 'breakthrough', 'stuck', 'final']
colors = {'start': 'blue', 'stuck': 'red', 'breakthrough': 'green', 'final': 'gold'}
sizes = {'start': 50, 'stuck': 100, 'breakthrough': 150, 'final': 300} # Scaled for visibility
labels = [
    "Initial State (13)\nBaseline",
    "Complexity Barrier\n(Stuck)",
    "Algorithmic Opt.\n(Breakthrough)",
    "Memory Limit\n(Stuck)",
    "Distributed Comp.\n(Breakthrough)",
    "Precision Error\n(Stuck)",
    "Final Proof\n(500,000+)"
]

# Style Setup
plt.rcParams['font.family'] = 'Times New Roman'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.grid'] = True
plt.rcParams['grid.alpha'] = 0.5
plt.rcParams['grid.color'] = '#cccccc'

def setup_plot():
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Axis Setup
    ax.set_xlabel('Dimension Space (Low to High)', fontsize=12, fontweight='bold')
    ax.set_ylabel('Hilbert Number Value', fontsize=12, fontweight='bold')
    ax.set_title('Research Breakthrough on Hilbert Number High-Dimensional Conjecture', fontsize=14, pad=20)
    
    # Log scale for Y because range is 13 to 500,000
    ax.set_yscale('log')
    ax.set_ylim(10, 1000000)
    ax.set_xlim(1.5, 8.5)
    
    # Custom ticks
    ax.set_xticks(x_data)
    ax.set_xticklabels([f"Dim {x}" for x in x_data])
    
    return fig, ax

def create_static_chart():
    fig, ax = setup_plot()
    
    # Plot Step Line
    ax.step(x_data, y_data, where='post', color='black', linewidth=1.5, label='Research Progress')
    
    # Plot Points
    for i, (x, y, ptype) in enumerate(zip(x_data, y_data, point_types)):
        color = colors[ptype]
        size = sizes[ptype]
        marker = '*' if ptype == 'final' else 'o'
        edgecolor = 'black' if ptype == 'final' else None
        
        ax.scatter(x, y, c=color, s=size, marker=marker, edgecolor=edgecolor, zorder=5)
        
        # Annotations
        offset = (0, 10) if i % 2 == 0 else (0, -20)
        # Adjust text position based on log scale visuals
        xytext = (0, 15) if ptype != 'stuck' else (0, -25)
        
        ax.annotate(labels[i], (x, y), xytext=xytext, 
                    textcoords='offset points', ha='center', va='center',
                    fontsize=8, bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="none", alpha=0.8))

    # Legend
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], marker='o', color='w', markerfacecolor='blue', label='Initial (13)', markersize=8),
        Line2D([0], [0], marker='o', color='w', markerfacecolor='red', label='Stuck Point', markersize=8),
        Line2D([0], [0], marker='o', color='w', markerfacecolor='green', label='Breakthrough', markersize=10),
        Line2D([0], [0], marker='*', color='w', markerfacecolor='gold', label='Final Goal', markersize=15, markeredgecolor='black'),
    ]
    ax.legend(handles=legend_elements, loc='lower right', frameon=True)
    
    # Save
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "hilbert_chart_static.png"), dpi=300)
    plt.savefig(os.path.join(OUTPUT_DIR, "hilbert_chart_static.svg"))
    plt.savefig(os.path.join(OUTPUT_DIR, "hilbert_chart_static.eps"))
    print("Static charts saved.")
    plt.close()

def create_animation():
    fig, ax = setup_plot()
    
    line, = ax.step([], [], where='post', color='black', linewidth=1.5)
    points_scatters = []
    
    # Create scatter objects for each point (initially invisible)
    for _ in range(len(x_data)):
        sc = ax.scatter([], [], zorder=5)
        points_scatters.append(sc)
        
    # Annotation texts
    texts = []
    
    def init():
        line.set_data([], [])
        for sc in points_scatters:
            sc.set_offsets(np.empty((0, 2)))
        return [line] + points_scatters

    def update(frame):
        # Frame 0 to N: Reveal points one by one
        # Let's say each point takes 10 frames to transition
        step_frames = 10
        current_idx = min(frame // step_frames, len(x_data) - 1)
        
        # Update line
        # Line should grow. 
        # If we are at index i, line covers 0 to i.
        line.set_data(x_data[:current_idx+1], y_data[:current_idx+1])
        
        # Update points
        artists = [line]
        
        for i in range(current_idx + 1):
            ptype = point_types[i]
            color = colors[ptype]
            base_size = sizes[ptype]
            marker = '*' if ptype == 'final' else 'o'
            
            # Effects
            current_size = base_size
            current_alpha = 1.0
            
            # Blinking for red (stuck)
            if ptype == 'stuck':
                # Blink every 5 frames
                if (frame % 10) < 5:
                    current_alpha = 0.5
            
            # Zoom/Pulse for gold (final)
            if ptype == 'final':
                # Pulse size
                pulse = np.sin(frame * 0.5) * 0.2 + 1.0 # 0.8 to 1.2
                current_size = base_size * pulse
                
            # Update scatter
            sc = points_scatters[i]
            sc.set_offsets(np.c_[[x_data[i]], [y_data[i]]])
            sc.set_color(color)
            sc.set_sizes([current_size])
            sc.set_alpha(current_alpha)
            
            # Only set marker style once (limitation of set_paths/scatter, 
            # but we can't change marker type easily in update for same object unless we recreate.
            # However, we created separate scatters for each point, so we can set paths if needed 
            # but easiest is just to assume we set it right or use plot for markers)
            # Scatter collection paths are complex.
            # Simpler approach: Use plot for markers? No, scatter supports sizes better.
            # We can't change marker type of existing PathCollection easily.
            # Workaround: The loop creates 'sc' for each point index. 
            # We need to set the marker at creation time or re-create.
            # Actually, let's just create them correctly in the list.
            
            artists.append(sc)
            
            # Add text if not present?
            # Animating text is tricky with blit. We will skip text animation for simplicity 
            # or just redraw all text up to current index.
            if i >= len(texts):
                # Add text
                t = ax.annotate(labels[i], (x_data[i], y_data[i]), 
                            xytext=(0, 15) if ptype != 'stuck' else (0, -25), 
                            textcoords='offset points', ha='center', va='center',
                            fontsize=8, bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="none", alpha=0.8))
                texts.append(t)
                artists.append(t)
        
        return artists

    # Re-create scatter list with correct markers
    points_scatters = []
    for i, ptype in enumerate(point_types):
        marker = '*' if ptype == 'final' else 'o'
        # edgecolors
        ec = 'black' if ptype == 'final' else 'face'
        sc = ax.scatter([], [], marker=marker, edgecolors=ec, zorder=5)
        points_scatters.append(sc)

    ani = animation.FuncAnimation(fig, update, frames=len(x_data)*10 + 20, init_func=init, blit=False, interval=100)
    
    # Save
    writer = animation.PillowWriter(fps=10)
    ani.save(os.path.join(OUTPUT_DIR, "hilbert_chart_animation.gif"), writer=writer)
    print("Animation saved.")
    plt.close()

if __name__ == "__main__":
    create_static_chart()
    create_animation()

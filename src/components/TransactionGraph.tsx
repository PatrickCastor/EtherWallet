"use client"

/**
 * Import necessary dependencies and types
 */
import type React from "react"
import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { SimulationNodeDatum } from "d3-force"

/**
 * Transaction interface defining the structure of transaction data
 * @property source - The address of the transaction sender
 * @property target - The address of the transaction recipient
 * @property amount - The amount of cryptocurrency transferred
 * @property date - The date and time of the transaction
 * @property transactionId - The unique identifier for the transaction
 */
interface Transaction {
  source: string
  target: string
  amount: number
  date: string
  transactionId: string
  direction: 'incoming' | 'outgoing'
  gasCost: number
}

/**
 * Node interface representing a wallet address in the graph
 * @property id - The wallet address
 * @property group - Optional grouping for visual differentiation
 * @property explored - Indicates if the node has been explored in the graph
 */
interface Node extends SimulationNodeDatum {
  id: string
  group?: number
  explored?: boolean
}

/**
 * Link interface representing a transaction between two nodes
 * @property source - The source node's wallet address
 * @property target - The target node's wallet address
 * @property value - The transaction amount
 * @property direction - Indicates if the transaction is incoming or outgoing relative to the focus address
 * @property transactionId - The unique identifier for the transaction
 */
interface Link {
  source: string | Node
  target: string | Node
  value: number
  direction: "outgoing" | "incoming"
  transactionId: string
}

/**
 * Props for the TransactionGraph component
 * @property transactions - Array of transactions to visualize
 * @property focusAddress - The main wallet address to focus on in the graph
 * @property onNodeClick - Callback function triggered when a node is clicked
 */
interface TransactionGraphProps {
  transactions: Transaction[]
  focusAddress: string
  onNodeClick: (address: string) => void
}

/**
 * TransactionGraph component
 * Renders an interactive D3 force-directed graph visualizing cryptocurrency transactions
 * @param props - The component props of type TransactionGraphProps
 * @returns A React functional component
 */
const TransactionGraph: React.FC<TransactionGraphProps> = ({ transactions, focusAddress, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [exploredNodes, setExploredNodes] = useState<Set<string>>(new Set([focusAddress]))
  const [error, setError] = useState<string | null>(null)
  const simulationRef = useRef<any>(null) // Store simulation reference
  const zoomRef = useRef<any>(null) // Store zoom reference
  
  // Add state for level of detail controls
  const [detailLevel, setDetailLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [transactionLimit, setTransactionLimit] = useState(50)
  const [isLoading, setIsLoading] = useState(false)
  const [displayedTransactionCount, setDisplayedTransactionCount] = useState(0)
  const [totalTransactionCount, setTotalTransactionCount] = useState(0)

  // Reset explored nodes when focus address changes
  useEffect(() => {
    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    
    // Reset explored nodes to only include the new focus address
    setExploredNodes(new Set([focusAddress]))
    
    // Clear any previous graph
    if (svgRef.current) {
      d3.select(svgRef.current).selectAll("*").remove();
    }
  }, [focusAddress])

  // Update detail level changes
  useEffect(() => {
    let limit = 50; // default medium
    
    switch (detailLevel) {
      case 'low':
        limit = 25;
        break;
      case 'medium':
        limit = 50;
        break;
      case 'high':
        limit = 100;
        break;
    }
    
    setTransactionLimit(limit);
  }, [detailLevel]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return
    
    // Indicate loading state
    setIsLoading(true);
    
    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    
    // Reset error state
    setError(null)
    
    // Check if we have valid transactions
    if (transactions.length === 0) {
      setError("No transaction data available to display in the graph.")
      setIsLoading(false);
      return
    }
    
    try {
      // Store the total count of original transactions
      setTotalTransactionCount(transactions.length);
      
      // Validate transactions data - ensure we're not filtering out valid transactions
      const validTransactions = transactions.filter(tx => 
        tx.source && tx.target && 
        typeof tx.amount === 'number' &&
        // Only filter out transactions where source and target are identical
        // This allows transactions where either source or target is the focus address
        tx.source !== tx.target
      );
      
      // Apply transaction limit based on detail level
      const limitedTransactions = validTransactions.slice(0, transactionLimit);
      setDisplayedTransactionCount(limitedTransactions.length);
      
      console.log("Valid transactions count:", validTransactions.length);
      console.log("Limited transactions count:", limitedTransactions.length);
      console.log("Focus address:", focusAddress);
      
      if (limitedTransactions.length === 0) {
        setError("No valid transaction data found. The transactions may be missing source or target addresses.")
        setIsLoading(false);
        return
      }
      
      // Get container dimensions for responsive sizing
      const containerRect = containerRef.current.getBoundingClientRect()
      const width = containerRect.width
      // Increased height to make the graph larger
      const height = 800

      const svg = d3.select(svgRef.current)
      svg.selectAll("*").remove()
      svg.attr("width", width).attr("height", height)

      // Get all connected nodes for the explored nodes
      const getConnectedNodes = (address: string): string[] => {
        return limitedTransactions
          .filter((t) => t.source === address || t.target === address)
          .map((t) => (t.source === address ? t.target : t.source))
      }

      // Create nodes and links based on explored nodes and their connections
      // First, collect all unique node IDs
      const nodeIds = new Set<string>();
      nodeIds.add(focusAddress); // Always include the focus address
      
      // Add all other addresses from valid transactions
      limitedTransactions.forEach(tx => {
        if (tx.source) nodeIds.add(tx.source);
        if (tx.target) nodeIds.add(tx.target);
      });
      
      // Create node objects from the IDs
      const nodes: Node[] = Array.from(nodeIds).map(id => ({
        id,
        explored: exploredNodes.has(id)
      }));
      
      console.log("Nodes created:", nodes.length);
      
      // Create a map of node IDs to node objects for quick lookup
      const nodeMap = new Map<string, Node>();
      nodes.forEach(node => {
        nodeMap.set(node.id, node);
      });

      // Process transactions to create directional links
      // IMPORTANT: Use node objects from the map instead of string IDs
      const links: any[] = limitedTransactions
        .filter((t) => {
          // Check if both source and target nodes exist
          return nodeMap.has(t.source) && nodeMap.has(t.target);
        })
        .map((t) => ({
          // Use node objects instead of string IDs
          source: nodeMap.get(t.source),
          target: nodeMap.get(t.target),
          value: t.amount || 0.0001, // Ensure non-zero amount for visibility
          direction: t.source === focusAddress ? "outgoing" : "incoming",
          transactionId: t.transactionId
        }));
      
      console.log("Links created:", links.length);
        
      // Check if we have valid links after filtering
      if (links.length === 0) {
        // If no links but we have transactions, create direct links to the focus address
        if (validTransactions.length > 0) {
          console.log("No links found, creating direct connections to focus address");
          
          // Get unique addresses that have interacted with the focus address
          const uniqueAddresses = new Set<string>();
          validTransactions.forEach(tx => {
            if (tx.source !== focusAddress) uniqueAddresses.add(tx.source);
            if (tx.target !== focusAddress) uniqueAddresses.add(tx.target);
          });
          
          // Create direct links between focus address and other addresses
          uniqueAddresses.forEach(address => {
            // Skip if the node doesn't exist in our node map
            if (!nodeMap.has(address) || !nodeMap.has(focusAddress)) return;
            
            // Find transactions where this address is involved
            const incomingTxs = validTransactions.filter(tx => 
              tx.source === address && tx.target === focusAddress
            );
            
            const outgoingTxs = validTransactions.filter(tx => 
              tx.source === focusAddress && tx.target === address
            );
            
            // Add incoming link if any
            if (incomingTxs.length > 0) {
              links.push({
                source: nodeMap.get(address),
                target: nodeMap.get(focusAddress),
                value: incomingTxs.reduce((sum, tx) => sum + tx.amount, 0),
                direction: "incoming",
                transactionId: incomingTxs[0].transactionId
              });
            }
            
            // Add outgoing link if any
            if (outgoingTxs.length > 0) {
              links.push({
                source: nodeMap.get(focusAddress),
                target: nodeMap.get(address),
                value: outgoingTxs.reduce((sum, tx) => sum + tx.amount, 0),
                direction: "outgoing",
                transactionId: outgoingTxs[0].transactionId
              });
            }
          });
          
          console.log("Created direct links:", links.length);
          
          // If we still have no links, show error
          if (links.length === 0) {
            setError("No valid connections found between addresses. Try searching for a different address.");
            console.log("Focus address:", focusAddress);
            console.log("Transactions:", transactions);
            console.log("Valid transactions:", validTransactions);
            console.log("Nodes:", nodes);
            return;
          }
        } else {
          setError("No valid connections found between addresses. Try searching for a different address.");
          console.log("Focus address:", focusAddress);
          console.log("Transactions:", transactions);
          console.log("Valid transactions:", validTransactions);
          console.log("Nodes:", nodes);
          return;
        }
      }

      // Normalize transaction values to prevent extremely large arrows
      const maxValue = Math.max(...links.map(l => l.value));
      const minValue = Math.min(...links.map(l => l.value));
      
      // Function to normalize values between 1 and 5 for arrow sizing
      const normalizeValue = (value: number) => {
        if (maxValue === minValue) return 2; // Default size if all values are the same
        return 1 + (value - minValue) / (maxValue - minValue) * 4;
      };

      // Create force simulation with improved forces for a Neo4j-like appearance
      const simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3
            .forceLink(links)
            .id((d: any) => d.id)
            .distance(350) // Increased from 250 to 350 for much better spacing
        )
        .force("charge", d3.forceManyBody().strength(-3000)) // Increased from -2000 to -3000 for more repulsion
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.05)) // Reduced strength to allow more spread
        .force("y", d3.forceY(height / 2).strength(0.05)) // Reduced strength to allow more spread
        .force("collision", d3.forceCollide().radius(150)) // Increased from 100 to 150 for more spacing
        .alphaTarget(0)
        .alphaDecay(0.1); // Faster decay for quicker stabilization
      
      // Store simulation reference for cleanup
      simulationRef.current = simulation;

      // Create a border to visually indicate the graph boundaries
      svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#0f172a") // Darker background for Neo4j-like appearance
        .attr("stroke", "#334155")
        .attr("stroke-width", 2)
        .attr("rx", 8)
        .attr("ry", 8);

      // Create a subtle grid pattern like Neo4j
      const gridSize = 50;
      svg.append("defs")
        .append("pattern")
        .attr("id", "grid")
        .attr("width", gridSize)
        .attr("height", gridSize)
        .attr("patternUnits", "userSpaceOnUse")
        .append("path")
        .attr("d", `M ${gridSize} 0 L 0 0 0 ${gridSize}`)
        .attr("fill", "none")
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 0.5);

      svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#grid)")
        .attr("rx", 8)
        .attr("ry", 8);

      // Create arrowhead marker definitions
      const defs = svg.append("defs")
      
      // Add arrow marker for outgoing transactions
      defs.append("marker")
        .attr("id", "arrow-outgoing")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)  // Position at the end of the line
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#f87171") // Red for outgoing
      
      // Add arrow marker for incoming transactions
      defs.append("marker")
        .attr("id", "arrow-incoming")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)  // Position at the end of the line
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#a78bfa") // Purple for incoming

      // Create container for zoom
      const container = svg
        .append("g")
        .attr("class", "container")

      // Add zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          container.attr("transform", event.transform)
        })

      // Store zoom reference for reset functionality
      zoomRef.current = zoom;
      
      svg.call(zoom as any)
      
      // Initial zoom to fit content
      svg.call(zoom.transform as any, d3.zoomIdentity.scale(0.7).translate(width / 4, height / 4))

      // Add links between nodes with Neo4j-like styling
      const link = container
        .append("g")
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("class", "link")
        .attr("stroke", (d) => d.direction === "outgoing" ? "#f87171" : "#a78bfa") // Red for out, purple for in
        .attr("stroke-width", (d) => Math.min(3, Math.max(1, Math.log(d.value + 1)))) // Scale line width by value
        .attr("stroke-opacity", 0.8)
        .attr("fill", "none")
        .attr("marker-end", (d) => `url(#arrow-${d.direction})`) // Add arrow markers
        .attr("cursor", "pointer")
        .attr("data-index", (d, i) => i) // Use data attribute instead of id
        .on("mouseover", function (event, d: any) {
          // Get index from data attribute
          const index = d3.select(this).attr("data-index");
          
          // Highlight the line
          d3.select(this)
            .attr("stroke-width", (d: any) => Math.min(5, Math.max(2, Math.log(d.value + 1) * 1.5)))
            .attr("stroke-opacity", 1);
          
          // Also highlight the corresponding label
          d3.select(`text[data-index='${index}']`)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill-opacity", 1);
        })
        .on("mouseout", function () {
          // Get index from data attribute
          const index = d3.select(this).attr("data-index");
          
          // Reset the line
          d3.select(this)
            .attr("stroke-width", (d: any) => Math.min(3, Math.max(1, Math.log(d.value + 1))))
            .attr("stroke-opacity", 0.8);
          
          // Reset the corresponding label
          d3.select(`text[data-index='${index}']`)
            .attr("font-size", "10px")
            .attr("font-weight", "bold")
            .attr("fill-opacity", 0.9);
        })
        .on("click", (event, d: any) => {
          event.stopPropagation();
          window.open(`https://etherscan.io/tx/${d.transactionId}`, '_blank');
        })
        .attr("d", getLinkPath);

      // Create link labels that are directly on the straight lines
      const linkLabelGroups = container
        .append("g")
        .selectAll("g")
        .data(links)
        .join("g")
        .attr("class", "link-label-group")
        .attr("data-index", (d, i) => i) // Use data attribute instead of id
        .attr("cursor", "pointer")
        .on("click", (event, d: any) => {
          event.stopPropagation();
          window.open(`https://etherscan.io/tx/${d.transactionId}`, '_blank');
        })
        .on("mouseover", function (event: any, d: any) {
          // Get index from data attribute
          const index = d3.select(this).attr("data-index");
          
          // Highlight the corresponding link
          d3.select(`path.link[data-index='${index}']`)
            .attr("stroke-width", (d: any) => Math.min(5, Math.max(2, Math.log(d.value + 1) * 1.5)))
            .attr("stroke-opacity", 1);
          
          // Highlight the label text
          d3.select(`text[data-index='${index}']`)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill-opacity", 1);
        })
        .on("mouseout", function (event: any, d: any) {
          // Get index from data attribute
          const index = d3.select(this).attr("data-index");
          
          // Reset the corresponding link
          d3.select(`path.link[data-index='${index}']`)
            .attr("stroke-width", (d: any) => Math.min(3, Math.max(1, Math.log(d.value + 1))))
            .attr("stroke-opacity", 0.8);
          
          // Reset the label text
          d3.select(`text[data-index='${index}']`)
            .attr("font-size", "10px")
            .attr("font-weight", "bold")
            .attr("fill-opacity", 0.9);
        });

      // Add text labels for transaction amounts directly on the lines without backgrounds
      linkLabelGroups
        .append("text")
        .attr("data-index", (d, i) => i) // Use data attribute instead of id
        .attr("text-anchor", "middle")
        .attr("dy", 0)
        .attr("fill", (d) => d.direction === "outgoing" ? "#f87171" : "#a78bfa")
        .attr("fill-opacity", 0.9)
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("text-shadow", "0 0 3px #000, 0 0 3px #000, 0 0 3px #000") // Add multiple text shadows for better visibility
        .text((d) => {
          // Shorten the text to avoid overlapping 
          return d.direction === "outgoing" 
            ? `Send: ${d.value.toFixed(4)}` 
            : `Rcv: ${d.value.toFixed(4)}`;
        });

      // Add tooltips to links
      linkLabelGroups.append("title")
        .text(d => `Transaction ID: ${d.transactionId}\nClick to view on Etherscan`);

      // Create node groups with Neo4j-like styling
      const node = container
        .append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        // Use type assertion to avoid TypeScript error
        .call((selection) => {
          const drag = d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
          drag(selection as any);
        });

      // Add node backgrounds with Neo4j-like appearance
      node
        .append("circle")
        .attr("r", (d) => (d.id === focusAddress ? 38 : 27)) // Increased by 1.5x (was 25 and 18)
        .attr("fill", (d) => {
          if (d.id === focusAddress) return "#10b981" // Neo4j-like green for focus node
          if (d.explored) return "#60a5fa" // Neo4j-like blue for explored nodes
          return "#9ca3af" // Gray for other nodes
        })
        .attr("stroke", "#0f172a") // Dark border
        .attr("stroke-width", 2)
        .attr("cursor", "pointer")
        .on("click", handleNodeClick)
        .on("mouseover", function () {
          d3.select(this)
            .attr("r", (d: any) => (d.id === focusAddress ? 42 : 30)) // Increased hover size
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2);
        })
        .on("mouseout", function () {
          d3.select(this)
            .attr("r", (d: any) => (d.id === focusAddress ? 38 : 27)) // Back to normal size
            .attr("stroke", "#0f172a")
            .attr("stroke-width", 2);
        });

      // Add a subtle ripple effect for Neo4j-like appearance
      node
        .append("circle")
        .attr("r", (d) => (d.id === focusAddress ? 38 : 27)) // Increased by 1.5x (was 25 and 18)
        .attr("fill", "none")
        .attr("stroke", (d) => {
          if (d.id === focusAddress) return "#10b981" // Neo4j-like green for focus node
          if (d.explored) return "#60a5fa" // Neo4j-like blue for explored nodes
          return "#9ca3af" // Gray for other nodes
        })
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.5)
        .attr("class", "ripple");

      // Animate the ripple effect
      node.selectAll(".ripple")
        .append("animate")
        .attr("attributeName", "r")
        .attr("values", function(d: any) {
          return d.id === focusAddress ? "38;52;38" : "27;36;27"; // Increased animation sizes proportionally
        })
        .attr("dur", "3s")
        .attr("repeatCount", "indefinite");

      // Add text labels INSIDE the nodes instead of using label backgrounds
      node
        .append("text")
        .text((d) => {
          // Shorten the address further for better fit inside circle
          return `${d.id.substring(0, 4)}..${d.id.slice(-3)}`;
        })
        .attr("text-anchor", "middle")
        .attr("dy", ".35em") // Center vertically
        .style("font-size", (d) => d.id === focusAddress ? "14px" : "12px") // Increased font size (was 11px and 9px)
        .style("font-weight", "bold")
        .style("fill", "#ffffff")
        .style("paint-order", "stroke") // Better text visibility
        .style("stroke", "#000")
        .style("stroke-width", "1px")
        .style("pointer-events", "none") // Prevent text from interfering with click events

      // Add tooltips with full addresses
      node.append("title").text((d) => d.id)

      // Function to generate straight paths for links
      function getLinkPath(d: any) {
        // Calculate the node radius with increased sizes
        const sourceRadius = d.source.id === focusAddress ? 38 : 27; // Updated from 25/18 to 38/27
        const targetRadius = d.target.id === focusAddress ? 38 : 27; // Updated from 25/18 to 38/27
        
        // Add a small gap for the arrow marker
        const arrowGap = 5;
      
        // Calculate direction vector
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
      
        // If source and target are the same, create a loop
        if (d.source === d.target) {
          const x = d.source.x;
          const y = d.source.y;
          return `M${x},${y - sourceRadius} A45,45 0 1,1 ${x + 0.01},${y - sourceRadius - 0.01}`; // Adjusted loop size
        }
      
        // Calculate start and end points, adjusting for node radius
        const startFactor = sourceRadius / distance;
        const endFactor = (distance - targetRadius - arrowGap) / distance;
      
        const startX = d.source.x + dx * startFactor;
        const startY = d.source.y + dy * startFactor;
        const endX = d.source.x + dx * endFactor;
        const endY = d.source.y + dy * endFactor;
      
        // Generate straight line from adjusted start to end point
        return `M${startX},${startY} L${endX},${endY}`;
      }

      // Update positions on each tick
      simulation.on("tick", () => {
        // Keep nodes within bounds with larger padding
        nodes.forEach((d: any) => {
          // Use larger padding (100px) to keep nodes well within the visible area
          d.x = Math.max(100, Math.min(width - 100, d.x))
          d.y = Math.max(100, Math.min(height - 100, d.y))
        })

        // Update link paths with straight lines
        link.attr("d", getLinkPath);

        // Update node positions
        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`)

        // Update link label positions to follow straight paths
        linkLabelGroups.attr("transform", (d: any) => {
          // Calculate direction vector
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate the midpoint of the line, but adjust for incoming/outgoing
          // For incoming (received) transactions, place closer to target
          // For outgoing (sent) transactions, place closer to source
          const positionFactor = d.direction === "incoming" ? 0.7 : 0.3; 
          const midX = d.source.x + dx * positionFactor;
          const midY = d.source.y + dy * positionFactor;
          
          // Move labels perpendicular to the line direction
          // Calculate unit vector perpendicular to the line
          const perpX = -dy / distance;
          const perpY = dx / distance;
          
          // Offset perpendicular to the line (15 pixels)
          const offsetDistance = d.direction === "incoming" ? -20 : 20;
          const offsetX = perpX * offsetDistance;
          const offsetY = perpY * offsetDistance;
          
          return `translate(${midX + offsetX},${midY + offsetY})`;
        });
      })

      // Node click handler
      function handleNodeClick(event: any, d: Node) {
        event.stopPropagation()
        setExploredNodes((prev) => new Set([...prev, d.id]))
        onNodeClick(d.id)
      }

      // Drag functions for nodes with more generic typing
      function dragstarted(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        // Reset the fixed positions temporarily to allow movement
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(event: any, d: any) {
        // Update the fixed position
        d.fx = event.x;
        d.fy = event.y;
      }
      
      function dragended(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0);
        // Keep the node fixed at its new position instead of releasing it
        // d.fx = null;
        // d.fy = null;
      }

      // Run simulation with higher alpha for better initial layout
      simulation.alpha(1).restart()
      
      // Make nodes static after initial stabilization
      // Higher alpha decay makes it stabilize faster
      // Then we'll explicitly stop the simulation
      setTimeout(() => {
        if (simulationRef.current) {
          simulationRef.current.stop();
          // Set positions as fixed once stabilized, but DON'T overwrite fx/fy if already set by dragging
          nodes.forEach(node => {
            // Fix nodes in place after simulation stabilizes
            if (node.x && node.y) {
              // Only set fx/fy if they aren't already set
              if (node.fx === undefined || node.fx === null) node.fx = node.x;
              if (node.fy === undefined || node.fy === null) node.fy = node.y;
            }
          });
          console.log("Simulation stopped, nodes fixed in place");
        }
        // Set loading state to false when done
        setIsLoading(false);
      }, 2000); // Allow 2 seconds for the simulation to stabilize

      return () => {
        if (simulationRef.current) {
          simulationRef.current.stop();
        }
      }
    } catch (e) {
      console.error("Graph rendering error:", e);
      setError("An error occurred while rendering the graph. Please try again later.")
      setIsLoading(false);
    }
  }, [transactions, focusAddress, exploredNodes, onNodeClick, transactionLimit])

  // Function to reset the view
  const resetView = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      const width = parseInt(svg.attr("width"));
      const height = parseInt(svg.attr("height"));
      
      // Apply the transform immediately without requiring drag
      svg.transition().duration(750).call(
        zoomRef.current.transform, 
        d3.zoomIdentity.scale(0.7).translate(width / 4, height / 4)
      );
    }
  };
  
  // Function to handle detail level change
  const handleDetailLevelChange = (level: 'low' | 'medium' | 'high') => {
    setDetailLevel(level);
  };

  return (
    <div ref={containerRef} className="w-full" style={{ height: "800px", overflow: "hidden", position: "relative" }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          <span className="inline-block w-3 h-3 bg-[#10b981] rounded-full mr-1"></span> Focus Address
          <span className="inline-block w-3 h-3 bg-[#60a5fa] rounded-full ml-4 mr-1"></span> Connected Address
          <span className="inline-block w-3 h-3 bg-[#f87171] rounded-full ml-4 mr-1"></span> Outgoing Transaction
          <span className="inline-block w-3 h-3 bg-[#a78bfa] rounded-full ml-4 mr-1"></span> Incoming Transaction
        </div>
        
        {/* Detail level controls */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Detail:</span>
          <button 
            className={`px-2 py-1 text-xs rounded ${detailLevel === 'low' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => handleDetailLevelChange('low')}
          >
            Low
          </button>
          <button 
            className={`px-2 py-1 text-xs rounded ${detailLevel === 'medium' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => handleDetailLevelChange('medium')}
          >
            Medium
          </button>
          <button 
            className={`px-2 py-1 text-xs rounded ${detailLevel === 'high' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => handleDetailLevelChange('high')}
          >
            High
          </button>
        </div>
      </div>
      
      {/* Transaction count info without load more button */}
      <div className="text-sm text-gray-400 mb-4 flex justify-between items-center">
        <p>Tip: Scroll to zoom, drag to move, click on addresses to explore their transactions.</p>
        <div className="flex items-center">
          <span>Showing {displayedTransactionCount} of {totalTransactionCount} transactions</span>
        </div>
      </div>
      
      {error ? (
        <div className="flex flex-col items-center justify-center h-[700px] bg-[#0f172a] rounded-lg border border-gray-800 p-6">
          <div className="text-red-400 mb-4">⚠️ {error}</div>
          <p className="text-gray-400 text-center max-w-md">
            This could be due to API limitations or the address having no transactions. 
            Try searching for a different address or try again later.
          </p>
        </div>
      ) : (
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a] bg-opacity-70 z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-t-[#4ADE80] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-white text-sm">Loading transactions...</p>
              </div>
            </div>
          )}
          <svg ref={svgRef} className="w-full h-full bg-[#0f172a] rounded-lg"></svg>
        </div>
      )}
      
      {/* Add a reset view button */}
      {!error && (
        <button 
          className="absolute bottom-4 right-4 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm"
          onClick={resetView}
        >
          Reset View
        </button>
      )}
    </div>
  )
}

/**
 * Export the TransactionGraph component as the default export
 */
export default TransactionGraph


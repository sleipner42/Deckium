#!/usr/bin/env python3
"""
AI Tool Usage Analyzer

This script analyzes debug log files from the Kraftpo-NG app to count tool usage
and generate a bar chart visualization.

Usage:
    python tool_usage_analyzer.py

Requirements:
    pip install matplotlib
"""

import os
import re
import glob
from collections import Counter
from pathlib import Path
import matplotlib.pyplot as plt


def parse_available_tools(tool_factory_path):
    """
    Parse ToolFactory.ts to extract all available tool names.
    
    Args:
        tool_factory_path (str): Path to the ToolFactory.ts file
        
    Returns:
        set: Set of all available tool names
    """
    available_tools = set()
    
    try:
        with open(tool_factory_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for tool class instantiations like "new ToolNameTool()"
        pattern = r'new ([A-Z][a-zA-Z]*Tool)\('
        matches = re.findall(pattern, content)
        
        # Convert class names to tool names (e.g., AddTextElementTool -> addTextElement)
        for class_name in matches:
            if class_name.endswith('Tool'):
                # Remove 'Tool' suffix and convert to camelCase
                tool_name = class_name[:-4]  # Remove 'Tool'
                # Convert first letter to lowercase
                tool_name = tool_name[0].lower() + tool_name[1:] if tool_name else ''
                available_tools.add(tool_name)
        
        print(f"Found {len(available_tools)} available tools in ToolFactory.ts")
        
    except Exception as e:
        print(f"Error reading ToolFactory.ts: {e}")
    
    return available_tools


def extract_tool_usage_from_file(file_path):
    """
    Extract tool usage from a single log file.
    
    Args:
        file_path (str): Path to the log file
        
    Returns:
        list: List of tool names found in the file
    """
    tools_found = []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # Pattern 1: Look for "Tool execution results: <toolName>:" in conversation logs
        pattern1 = r'Tool execution results: ([^:]+):'
        matches1 = re.findall(pattern1, content)
        tools_found.extend(matches1)
        
        # Pattern 2: Look for JSON tool calls like {"tool": "toolName", ...}
        pattern2 = r'\{"tool":\s*"([^"]+)"'
        matches2 = re.findall(pattern2, content)
        tools_found.extend(matches2)
        
        # Pattern 3: Look for tool usage in system messages
        pattern3 = r'Tool execution: ([a-zA-Z][a-zA-Z0-9_]*)'
        matches3 = re.findall(pattern3, content)
        tools_found.extend(matches3)
        
        print(f"Found {len(tools_found)} tool usages in {os.path.basename(file_path)}")
        
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    
    return tools_found


def analyze_all_logs(logs_directory):
    """
    Analyze all debug log files in the specified directory.
    
    Args:
        logs_directory (str): Path to the directory containing log files
        
    Returns:
        Counter: Tool usage counts
    """
    # Find only AI debug log files (conversation logs are filtered duplicates)
    ai_debug_pattern = os.path.join(logs_directory, 'ai-debug-*.log')
    
    ai_debug_files = glob.glob(ai_debug_pattern)
    
    all_log_files = ai_debug_files
    
    print(f"Found {len(ai_debug_files)} AI debug files")
    
    all_tools = []
    
    for log_file in sorted(all_log_files):
        tools_in_file = extract_tool_usage_from_file(log_file)
        all_tools.extend(tools_in_file)
    
    # Count tool usage
    tool_counts = Counter(all_tools)
    
    print(f"\nTotal tool executions found: {len(all_tools)}")
    print(f"Unique tools used: {len(tool_counts)}")
    
    return tool_counts


def create_bar_chart(tool_counts, available_tools, output_path=None):
    """
    Create a bar chart visualization of tool usage.
    
    Args:
        tool_counts (Counter): Tool usage counts
        available_tools (set): Set of all available tool names
        output_path (str): Optional path to save the chart
    """
    if not tool_counts:
        print("No tool usage data found to visualize.")
        return
    
    # Find unused tools
    used_tools = set(tool_counts.keys())
    unused_tools = available_tools - used_tools
    
    # Sort tools by usage count (descending), then add unused tools
    sorted_used_tools = tool_counts.most_common()
    sorted_unused_tools = [(tool, 0) for tool in sorted(unused_tools)]
    
    # Combine used and unused tools
    all_tools = sorted_used_tools + sorted_unused_tools
    
    # Extract tool names and counts
    tool_names = [tool[0] for tool in all_tools]
    usage_counts = [tool[1] for tool in all_tools]
    
    # Create colors: blue for used tools, red for unused tools
    colors = ['steelblue' if count > 0 else 'lightcoral' for count in usage_counts]
    
    # Create the bar chart
    plt.figure(figsize=(16, 8))
    bars = plt.bar(range(len(tool_names)), usage_counts, color=colors, alpha=0.7)
    
    # Customize the chart
    plt.title('AI Tool Usage Statistics (Blue: Used, Red: Unused)', fontsize=16, fontweight='bold', pad=20)
    plt.xlabel('Tools', fontsize=12)
    plt.ylabel('Usage Count', fontsize=12)
    
    # Set x-axis labels
    plt.xticks(range(len(tool_names)), tool_names, rotation=45, ha='right')
    
    # Add value labels on top of bars (only for used tools)
    for i, (bar, count) in enumerate(zip(bars, usage_counts)):
        if count > 0:  # Only show labels for used tools
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5, 
                    str(count), ha='center', va='bottom', fontsize=10)
    
    # Add grid for better readability
    plt.grid(axis='y', alpha=0.3, linestyle='--')
    
    # Adjust layout to prevent label cutoff
    plt.tight_layout()
    
    # Save the chart (don't show interactively to avoid blocking)
    if output_path:
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"Chart saved to: {output_path}")
    else:
        output_path = 'tool_usage_chart.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"Chart saved to: {output_path}")
    
    plt.close()  # Close the plot to free memory


def print_usage_summary(tool_counts, available_tools):
    """
    Print a summary of tool usage statistics.
    
    Args:
        tool_counts (Counter): Tool usage counts
        available_tools (set): Set of all available tool names
    """
    if not tool_counts:
        print("No tool usage data found.")
        return
    
    print("\n" + "="*60)
    print("TOOL USAGE SUMMARY")
    print("="*60)
    
    sorted_tools = tool_counts.most_common()
    
    for i, (tool_name, count) in enumerate(sorted_tools, 1):
        percentage = (count / sum(tool_counts.values())) * 100
        print(f"{i:2}. {tool_name:<25} | {count:4} uses | {percentage:5.1f}%")
    
    print("="*60)
    print(f"Total tool executions: {sum(tool_counts.values())}")
    print(f"Unique tools used: {len(tool_counts)}")
    
    # Top 5 most used tools
    print(f"\nTop 5 most used tools:")
    for i, (tool_name, count) in enumerate(sorted_tools[:5], 1):
        print(f"  {i}. {tool_name} ({count} uses)")
    
    # Find and display unused tools
    used_tools = set(tool_counts.keys())
    unused_tools = available_tools - used_tools
    
    if unused_tools:
        print(f"\nUnused tools ({len(unused_tools)}):")
        for tool in sorted(unused_tools):
            print(f"  - {tool}")
    else:
        print(f"\nAll available tools have been used!")


def main():
    """Main function to run the analysis."""
    # Get the script directory and find the logs folder
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    logs_dir = repo_root / 'app' / 'logs'
    tool_factory_path = repo_root / 'app' / 'src' / 'main' / 'ai' / 'tools' / 'ToolFactory.ts'
    
    if not logs_dir.exists():
        print(f"Error: Logs directory not found at {logs_dir}")
        print("Please ensure you're running this script from the analysis folder in the repo root.")
        return
        
    if not tool_factory_path.exists():
        print(f"Error: ToolFactory.ts not found at {tool_factory_path}")
        return
    
    print(f"Analyzing logs in: {logs_dir}")
    print(f"Reading available tools from: {tool_factory_path}")
    print("-" * 60)
    
    # Parse available tools
    available_tools = parse_available_tools(str(tool_factory_path))
    
    # Analyze tool usage
    tool_counts = analyze_all_logs(str(logs_dir))
    
    # Print summary
    print_usage_summary(tool_counts, available_tools)
    
    # Create visualization
    output_file = script_dir / 'tool_usage_chart.png'
    create_bar_chart(tool_counts, available_tools, str(output_file))
    
    print(f"\nAnalysis complete! Check {output_file} for the visualization.")


if __name__ == "__main__":
    main()
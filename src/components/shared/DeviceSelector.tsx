/**
 * DeviceSelector — Shared Audio Output Device Menu
 *
 * Used by both PlayerBar (desktop) and MobilePlayerDrawer.
 */

import React, { useState, useCallback } from 'react';
import { MonitorSpeaker, Check, RefreshCw, X } from 'lucide-react';
import type { OutputDevice } from '../../hooks/useAudioEngine';

interface DeviceSelectorProps {
  outputDevices: OutputDevice[];
  selectedDevice: string;
  onSelect: (deviceId: string) => void;
  onRefresh?: () => void;
  /** Size of the trigger icon */
  iconSize?: number;
  /** Show close button in the menu header */
  showClose?: boolean;
  /** Menu position: bottom-right or bottom-left */
  position?: 'bottom-right' | 'bottom-left';
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  outputDevices,
  selectedDevice,
  onSelect,
  onRefresh,
  iconSize = 18,
  showClose = false,
  position = 'bottom-right',
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!showMenu) {
        onRefresh?.();
      }
      setShowMenu(!showMenu);
    },
    [showMenu, onRefresh]
  );

  const handleSelect = useCallback(
    (e: React.MouseEvent, deviceId: string) => {
      e.stopPropagation();
      onSelect(deviceId);
      setShowMenu(false);
    },
    [onSelect]
  );

  const positionClass =
    position === 'bottom-left'
      ? 'bottom-full left-0 mb-2'
      : 'bottom-full right-0 mb-2';

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className={`p-2 transition-colors ${
          showMenu ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <MonitorSpeaker size={iconSize} />
      </button>

      {showMenu && (
        <div
          className={`absolute ${positionClass} w-64 bg-surface-hover rounded-lg shadow-xl border border-divider py-2 z-50 overflow-hidden`}
        >
          {/* Header */}
          <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-divider flex justify-between items-center">
            <span>Output Devices</span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh?.();
                }}
                className="hover:text-text-primary p-1"
              >
                <RefreshCw size={14} />
              </button>
              {showClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                  className="hover:text-text-primary p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Device List */}
          <div className="max-h-60 overflow-y-auto">
            {outputDevices.length > 0 ? (
              outputDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={(e) => handleSelect(e, device.deviceId)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors ${
                    selectedDevice === device.deviceId
                      ? 'text-accent bg-accent/10'
                      : 'text-text-primary hover:bg-surface'
                  }`}
                >
                  <MonitorSpeaker size={14} />
                  <span className="truncate flex-1 text-left">{device.label}</span>
                  {selectedDevice === device.deviceId && (
                    <Check size={14} className="text-accent" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-text-secondary">
                <MonitorSpeaker size={24} className="mx-auto mb-2 opacity-50" />
                <p>No external devices found</p>
                <p className="text-xs mt-1">Showing system default</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceSelector;

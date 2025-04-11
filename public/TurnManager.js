class TurnManager {
    /**
     * @param {object} photonClient - The Photon client instance.
     * @param {function} onTurnChanged - Callback to notify the UI (or other logic) when the turn changes.
     */
    constructor(photonClient, onTurnChanged) {
      this.photonClient = photonClient;
      this.onTurnChanged = onTurnChanged;
      this.turnOrder = [];           // Array of player identifiers
      this.currentTurnIndex = 0;     // Pointer to the current turn
      this.turnTimeout = 30000;      // Timeout duration (in ms) per turn – adjust as needed
      this.turnTimer = null;
    }
  
    /**
     * Initializes the turn order. Typically called by the Master client when the battle starts.
     * @param {Array} players - An array of unique identifiers (e.g., actor numbers as strings).
     */
    initializeTurnOrder(players) {
      this.turnOrder = players;
      this.currentTurnIndex = 0;
      this._updateRoomProperties();
      this._triggerTurnChanged();
      this._resetTurnTimer();
    }
  
    /**
     * Updates local turn state based on Photon room properties.
     * Should be called from your onPropertiesChanged handler.
     * @param {object} props - Photon room custom properties (expecting turnOrder and currentTurnIndex)
     */
    updateFromRoomProps(props) {
      if (props && props.turnOrder && typeof props.currentTurnIndex === 'number') {
        // Only update if something has changed
        if (this.currentTurnIndex !== props.currentTurnIndex ||
            JSON.stringify(this.turnOrder) !== JSON.stringify(props.turnOrder)) {
          this.turnOrder = props.turnOrder;
          this.currentTurnIndex = props.currentTurnIndex;
          this._triggerTurnChanged();
          this._resetTurnTimer();
        }
      }
    }
  
    /**
     * Advances the turn to the next player.
     * Only the Master client should call this method.
     */
    advanceTurn() {
      // Only proceed if you are the Master client
      if (!this.photonClient.isMasterClient()) return;
  
      this._clearTurnTimer();
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      this._updateRoomProperties();
      this._triggerTurnChanged();
      this._resetTurnTimer();
    }
  
    /**
     * Private: Updates Photon room custom properties with the current turn data.
     */
    _updateRoomProperties() {
      const newProps = {
        turnOrder: this.turnOrder,
        currentTurnIndex: this.currentTurnIndex,
      };
  
      this.photonClient.myRoom().setCustomProperties(newProps, null, function(success, errorMsg) {
        if (!success) {
          console.error("Failed to update turn properties:", errorMsg);
        }
      });
    }
  
    /**
     * Private: Calls the onTurnChanged callback with the new state.
     */
    _triggerTurnChanged() {
        const activeCombatant = this.turnOrder[this.currentTurnIndex];
        // Compare using the composite id.
        const isMyTurn = (activeCombatant.id === this._getLocalPlayerIdentifier());
        if (typeof this.onTurnChanged === 'function') {
          this.onTurnChanged({
            activePlayer: activeCombatant.displayName,
            activePlayerId: activeCombatant.id,
            currentTurnIndex: this.currentTurnIndex,
            isMyTurn: isMyTurn,
          });
        }
      }
  
    /**
     * Private: Resets the turn timeout timer.
     * If the active player does not act within the allotted time,
     * the Master client automatically advances the turn.
     */
    _resetTurnTimer() {
      this._clearTurnTimer();
      // Optionally, only start the timer on the active player's turn;
      // For simplicity, we start it regardless—Master will auto-advance.
      this.turnTimer = setTimeout(() => {
        console.warn("Turn timeout reached; auto-advancing turn.");
        this.advanceTurn();
      }, this.turnTimeout);
    }
  
    _clearTurnTimer() {
      if (this.turnTimer) {
        clearTimeout(this.turnTimer);
        this.turnTimer = null;
      }
    }
  
    /**
     * Private: Determines the local player's unique identifier.
     */
    _getLocalPlayerIdentifier() {
        const actor = this.photonClient.myActor();
        return actor ? actor.actorNr.toString() : null;
      }
  }
  
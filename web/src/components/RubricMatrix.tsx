export interface RubricCriterion {
  id: string;
  description: string;
}

interface RubricMatrixProps {
  criteria: RubricCriterion[];
  editable?: boolean;
  onChange?: (criteria: RubricCriterion[]) => void;
}

/**
 * The contract stores `rubric_json` as an opaque, caller-authored string
 * (see contracts/agentverdict.py `create_agreement`) — there is no
 * on-chain rubric schema beyond "must not be empty". This matrix is the
 * frontend's own convention: an array of {id, description} criteria,
 * frozen into `rubric_json` at creation time and never editable afterward
 * (feature 4, Constitutional Agreement Engine).
 */
export function RubricMatrix({ criteria, editable = false, onChange }: RubricMatrixProps) {
  const update = (index: number, field: keyof RubricCriterion, value: string) => {
    if (!onChange) return;
    const next = criteria.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    onChange(next);
  };

  const addRow = () => {
    if (!onChange) return;
    onChange([...criteria, { id: `criterion-${criteria.length + 1}`, description: "" }]);
  };

  const removeRow = (index: number) => {
    if (!onChange) return;
    onChange(criteria.filter((_, i) => i !== index));
  };

  if (criteria.length === 0 && !editable) {
    return <p className="field-help">No rubric criteria recorded.</p>;
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th scope="col">Criterion ID</th>
            <th scope="col">Description</th>
            {editable && <th scope="col">
              <span className="sr-only">Actions</span>
            </th>}
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, i) => (
            <tr key={i}>
              <td>
                {editable ? (
                  <input
                    type="text"
                    value={c.id}
                    onChange={(e) => update(i, "id", e.target.value)}
                    aria-label={`Criterion ${i + 1} id`}
                  />
                ) : (
                  <span className="mono">{c.id}</span>
                )}
              </td>
              <td>
                {editable ? (
                  <input
                    type="text"
                    value={c.description}
                    onChange={(e) => update(i, "description", e.target.value)}
                    aria-label={`Criterion ${i + 1} description`}
                  />
                ) : (
                  c.description
                )}
              </td>
              {editable && (
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow(i)}>
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={addRow} style={{ marginTop: 8 }}>
          Add criterion
        </button>
      )}
    </div>
  );
}

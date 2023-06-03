import { line as d3Line } from "d3";
import { select as d3Select } from "d3-selection";
import { scaleLinear, scaleSequential } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";
import styles from "./flat-drawing-helper.module.css";

const path = d3Line()
  .x(d => d.x)
  .y(d => d.y);

const sizeScale = scaleLinear()
  .range([20, 50])
  .domain([10, 200]);
const sqMPriceScale = scaleSequential(interpolateRdYlGn);

export const createNgon = ({ x, y, sides, radius, rotation = 0 }) => {
  const coords = [];

  for (
    let a = 0 + rotation;
    a <= 360 + rotation;
    a += Math.round(360 / sides)
  ) {
    const theta = (a * Math.PI) / 180;

    coords.push({
      x: x + radius * Math.cos(theta),
      y: y + radius * Math.sin(theta)
    });
  }

  return coords;
};

export const getDrawFunction = ({ config }) => ({
  container,
  map,
  flats,
  onMouseOver,
  onMouseOut,
  onClick,
  selectedFlatId,
  previewedFlatId
}) => {
  container.classed(styles.containerWithSelection, selectedFlatId !== null);

  const feature = container.selectAll(".flat").data(
    flats.map(flat => {
      const { x, y } = map.latLngToLayerPoint([flat.latitude, flat.longitude]);
      const radius = sizeScale(flat.size);
      return {
        flat,
        x,
        y,
        radius,
        polygon: createNgon({
          x,
          y,
          sides: Math.ceil(flat.rooms + 1),
          radius,
          rotation: 270
        })
      };
    }),
    ({ flat }) => flat.id
  );

  const addOrUpdatePath = feature => {
    feature.attr("d", ({ flat, polygon }) =>
      flat.rooms === 1 ? null : path(polygon)
    );
  };

  const addOrUpdateCircle = feature => {
    feature.attr("cx", ({ flat, x }) => (flat.rooms === 1 ? x : null));
    feature.attr("cy", ({ flat, y }) => (flat.rooms === 1 ? y : null));
    feature.attr("r", ({ flat, radius }) => (flat.rooms === 1 ? radius : null));
  };

  const sqMPriceScaleWithDomain = sqMPriceScale.domain([
    config.pricePerSqM.max,
    config.pricePerSqM.min
  ]);

  const addOrUpdate = feature => {
    addOrUpdateCircle(feature);
    addOrUpdatePath(feature);
    feature
      .style("fill", ({ flat }) =>
        sqMPriceScaleWithDomain(flat.price / flat.size)
      )
      .attr("class", `flat ${styles.flatmarker}`)
      .classed(
        styles.flatmarkerSelected,
        ({ flat }) => selectedFlatId && flat.id === selectedFlatId
      )
      .classed(
        styles.flatmarkerHovered,
        ({ flat }) => previewedFlatId && flat.id === previewedFlatId
      )
      .on("mouseover", function(event, { flat }) {
        onMouseOver && onMouseOver(flat);
        d3Select(this).classed(styles.flatmarkerHovered, true);
      })
      .on("mouseout", function(event, { flat }) {
        onMouseOut && onMouseOut(flat);
        d3Select(this).classed(styles.flatmarkerHovered, false);
      })
      .on("click", function(event, { flat }) {
        onClick && onClick(flat);
        event.stopPropagation();
        return false;
      });
  };

  feature
    .enter()
    .append(d =>
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        d.rooms === 1 ? "circle" : "path"
      )
    )
    .call(addOrUpdate);

  feature.exit().remove();

  feature.call(addOrUpdate);
};

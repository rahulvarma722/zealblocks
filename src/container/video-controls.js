/**
 * Container — the background video (P-43), in its own Settings panel: a
 * media file, not a style, and one for every device.
 */

import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	Button,
	Flex,
	FocalPointPicker,
	PanelBody,
	ToggleControl,
} from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function VideoPanel( { attributes, setAttributes } ) {
	const {
		videoUrl,
		videoId,
		videoPoster,
		videoPosterId,
		videoPosition,
		videoOnMobile,
	} = attributes;

	const media = ( type, value, onSelect, chooseLabel, replaceLabel, has ) => (
		<MediaUploadCheck>
			<MediaUpload
				allowedTypes={ [ type ] }
				value={ value }
				onSelect={ onSelect }
				render={ ( { open } ) => (
					<Button
						__next40pxDefaultSize
						variant="secondary"
						onClick={ open }
					>
						{ has ? replaceLabel : chooseLabel }
					</Button>
				) }
			/>
		</MediaUploadCheck>
	);

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Background video', 'zealblocks' ) }
				initialOpen={ !! videoUrl }
			>
				<Flex direction="column" gap={ 3 } align="stretch">
					{ media(
						'video',
						videoId,
						( file ) =>
							setAttributes( {
								videoUrl: file.url,
								videoId: file.id,
							} ),
						__( 'Choose video', 'zealblocks' ),
						__( 'Replace video', 'zealblocks' ),
						!! videoUrl
					) }

					{ !! videoUrl && (
						<>
							<FocalPointPicker
								__nextHasNoMarginBottom
								label={ __( 'Focal point', 'zealblocks' ) }
								url={ videoUrl }
								value={ videoPosition }
								onChange={ ( next ) =>
									setAttributes( { videoPosition: next } )
								}
							/>
							{ media(
								'image',
								videoPosterId,
								( file ) =>
									setAttributes( {
										videoPoster: file.url,
										videoPosterId: file.id,
									} ),
								__( 'Choose poster image', 'zealblocks' ),
								__( 'Replace poster image', 'zealblocks' ),
								!! videoPoster
							) }
							{ !! videoPoster && (
								<Button
									__next40pxDefaultSize
									variant="tertiary"
									isDestructive
									onClick={ () =>
										setAttributes( {
											videoPoster: undefined,
											videoPosterId: undefined,
										} )
									}
								>
									{ __( 'Remove poster', 'zealblocks' ) }
								</Button>
							) }
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __( 'Play on mobile', 'zealblocks' ) }
								checked={ false !== videoOnMobile }
								onChange={ ( next ) =>
									setAttributes( { videoOnMobile: next } )
								}
								help={ __(
									'Off: phones show the background instead, and never download the video.',
									'zealblocks'
								) }
							/>
							<Button
								__next40pxDefaultSize
								variant="tertiary"
								isDestructive
								onClick={ () =>
									setAttributes( {
										videoUrl: undefined,
										videoId: undefined,
										videoPosition: undefined,
									} )
								}
							>
								{ __( 'Remove video', 'zealblocks' ) }
							</Button>
						</>
					) }

					<p
						// Help text outside a control: the same grey and size.
						style={ {
							margin: 0,
							fontSize: '12px',
							color: '#757575',
						} }
					>
						{ __(
							'Plays muted, on a loop, with a pause button. Visitors who prefer reduced motion see the poster and can choose to play it. Without JavaScript only the poster shows.',
							'zealblocks'
						) }
					</p>
				</Flex>
			</PanelBody>
		</InspectorControls>
	);
}
